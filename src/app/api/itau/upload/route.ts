/**
 * /api/itau/upload/route.ts
 * Pipeline real de importação de extratos bancários Itaú.
 *
 * Suporta: PDF (extrato conta corrente), OFX, CSV
 * Fluxo: Auth → Parse → Deduplica (SHA-256) → Insere → Atualiza saldos → Log
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface ParsedTransaction {
  date: string;        // ISO 8601
  description: string;
  amount: number;      // positivo = crédito, negativo = débito
  category: string;
  icon: string;
}

interface UploadResult {
  inserted: number;
  duplicates: number;
  errors: number;
  total: number;
  transactions: ParsedTransaction[];
}

// ---------------------------------------------------------------------------
// Utilitário: SHA-256 hash para deduplicação determinística
// ---------------------------------------------------------------------------

function buildSourceHash(userId: string, date: string, description: string, amount: number): string {
  const normalized = `${userId}|${date.substring(0, 10)}|${description.trim().toLowerCase()}|${amount.toFixed(2)}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// ---------------------------------------------------------------------------
// Inferência de categoria por keyword matching no estilo Itaú
// ---------------------------------------------------------------------------

function inferCategory(description: string): { category: string; icon: string } {
  const desc = description.toLowerCase();

  if (/pix\s*(transf|receb|enviado|recebido|qrs)/i.test(desc)) {
    return { category: 'Transferência', icon: 'ArrowLeftRight' };
  }
  if (/remuner|salario|salário|pagto\s+sal/i.test(desc)) {
    return { category: 'Salário', icon: 'Wallet' };
  }
  if (/fatura\s*(paga|cartao|cartão|itau|platinum|black)/i.test(desc)) {
    return { category: 'Cartão', icon: 'CreditCard' };
  }
  if (/sabesp|enel|comgas|luz|água|agua|energia|eletric/i.test(desc)) {
    return { category: 'Utilidades', icon: 'Zap' };
  }
  if (/supermercado|atacad|carrefour|pao\s*de\s*acucar|extra|mercado/i.test(desc)) {
    return { category: 'Alimentação', icon: 'ShoppingCart' };
  }
  if (/farmacia|drogaria|clinica|saude|medic|hospital|unimed|amil/i.test(desc)) {
    return { category: 'Saúde', icon: 'Heart' };
  }
  if (/uber|99|taxi|onibus|metrô|metro|transporte|gasolina|posto/i.test(desc)) {
    return { category: 'Transporte', icon: 'Car' };
  }
  if (/netflix|spotify|amazon|apple|youtube|disney|streaming|assinatura/i.test(desc)) {
    return { category: 'Assinaturas', icon: 'Tv' };
  }
  if (/boleto|pag\s*boleto|pag\s*conta/i.test(desc)) {
    return { category: 'Boleto', icon: 'FileText' };
  }
  if (/rendimento|juros|cdb|tesouro|investimento|aplicacao|aplicação/i.test(desc)) {
    return { category: 'Rendimentos', icon: 'TrendingUp' };
  }
  if (/pay\s*(outba|bubbl)|picpay|nubank|inter\b/i.test(desc)) {
    return { category: 'Transferência', icon: 'ArrowLeftRight' };
  }
  if (/int\s*\//i.test(desc)) {
    return { category: 'Débito', icon: 'ArrowUpRight' };
  }

  // Fallback baseado no sinal
  return { category: 'Outros', icon: 'Circle' };
}

// ---------------------------------------------------------------------------
// Parser PDF — Extrato Conta Corrente Itaú
//
// Formato esperado (conforme PDF real):
//   26/05/2026  SALDO DO DIA                              61,33
//   25/05/2026  PIX QRS PAGSEGURO 124/05               -14,87
//   04/05/2026  REMUNERACAO/SALARIO                   1.840,26
// ---------------------------------------------------------------------------

async function parsePdf(buffer: Buffer): Promise<ParsedTransaction[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  const result = await parser.getText();
  const text = result.text;

  const transactions: ParsedTransaction[] = [];

  // Regex calibrada para o formato de extrato Itaú conta corrente:
  // DD/MM/YYYY  DESCRIÇÃO (pode ter espaços e caracteres)  VALOR (ex: -1.234,56 ou 987,65)
  // Usamos \s+ em vez de \s{2,} porque o parser pode retornar apenas um espaço de separação.
  const lineRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/gm;

  let match: RegExpExecArray | null;
  while ((match = lineRegex.exec(text)) !== null) {
    const [, rawDate, rawDesc, rawAmount] = match;

    const description = rawDesc.trim();

    // Ignorar linhas de saldo (não são lançamentos)
    if (/^SALDO DO DIA$/i.test(description)) continue;

    // Parsear data: DD/MM/YYYY → ISO
    const [day, month, year] = rawDate.split('/');
    const isoDate = `${year}-${month}-${day}T12:00:00.000Z`;

    // Parsear valor: remover pontos de milhar, trocar vírgula por ponto
    const amountStr = rawAmount.replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) continue;

    const { category, icon } = inferCategory(description);

    transactions.push({ date: isoDate, description, amount, category, icon });
  }

  return transactions;
}

// ---------------------------------------------------------------------------
// Parser OFX — Open Financial Exchange (XML-like format)
// ---------------------------------------------------------------------------

function parseOfx(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Extrair blocos de transação
  const txBlocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];

  for (const block of txBlocks) {
    const getTag = (tag: string) => {
      const match = block.match(new RegExp(`<${tag}>([^<]+)`, 'i'));
      return match ? match[1].trim() : '';
    };

    const rawDate = getTag('DTPOSTED');     // Formato: YYYYMMDD ou YYYYMMDDHHMMSS
    const rawAmount = getTag('TRNAMT');     // Ex: -259.90
    const memo = getTag('MEMO') || getTag('NAME') || 'Lançamento OFX';

    if (!rawDate || !rawAmount) continue;

    // Normalizar data OFX para ISO
    const year = rawDate.substring(0, 4);
    const month = rawDate.substring(4, 6);
    const day = rawDate.substring(6, 8);
    const isoDate = `${year}-${month}-${day}T12:00:00.000Z`;

    const amount = parseFloat(rawAmount);
    if (isNaN(amount)) continue;

    const { category, icon } = inferCategory(memo);
    transactions.push({ date: isoDate, description: memo, amount, category, icon });
  }

  return transactions;
}

// ---------------------------------------------------------------------------
// Parser CSV — Extrato CSV Itaú
//
// Formato esperado:
// Data;Lançamento;Valor
// 26/05/2026;PIX QRS PAGSEGURO 124/05;-14,87
// ---------------------------------------------------------------------------

function parseCsv(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length < 2) return transactions;

  // Detectar delimitador (ponto-e-vírgula ou vírgula)
  const delimiter = lines[0].includes(';') ? ';' : ',';

  // Pular cabeçalho
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length < 3) continue;

    const [rawDate, rawDesc, rawAmount] = cols;

    // Suportar DD/MM/YYYY e YYYY-MM-DD
    let isoDate: string;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split('/');
      isoDate = `${y}-${m}-${d}T12:00:00.000Z`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      isoDate = `${rawDate}T12:00:00.000Z`;
    } else {
      continue;
    }

    const amountStr = rawAmount.replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) continue;

    const description = rawDesc.trim();
    if (!description) continue;

    const { category, icon } = inferCategory(description);
    transactions.push({ date: isoDate, description, amount, category, icon });
  }

  return transactions;
}

// ---------------------------------------------------------------------------
// Route Handler — POST /api/itau/upload
// ---------------------------------------------------------------------------

export const runtime = 'nodejs'; // pdf-parse requer Node.js runtime

export async function POST(req: Request): Promise<NextResponse> {
  // 1. Auth via server client com cookies (sessão real)
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Sessão inválida. Faça login novamente.' },
      { status: 401 }
    );
  }

  // 2. Receber arquivo via multipart/form-data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'Request inválida. Envie o arquivo como multipart/form-data.' },
      { status: 400 }
    );
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json(
      { error: 'Nenhum arquivo recebido. Campo obrigatório: "file".' },
      { status: 400 }
    );
  }

  // 3. Validar extensão e tamanho (máx 10MB)
  const fileName = file.name.toLowerCase();
  const extension = fileName.split('.').pop();
  const allowedExtensions = ['pdf', 'ofx', 'csv'];

  if (!extension || !allowedExtensions.includes(extension)) {
    return NextResponse.json(
      { error: `Formato não suportado: ".${extension}". Use PDF, OFX ou CSV.` },
      { status: 422 }
    );
  }

  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Arquivo excede o tamanho máximo de 10MB.' },
      { status: 413 }
    );
  }

  // 4. Parse conforme tipo
  let parsed: ParsedTransaction[] = [];
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (extension === 'pdf') {
      parsed = await parsePdf(buffer);
    } else if (extension === 'ofx') {
      parsed = parseOfx(buffer.toString('utf-8'));
    } else if (extension === 'csv') {
      // Tentar UTF-8, fallback para latin1 (comum em exports brasileiros)
      let text = buffer.toString('utf-8');
      if (text.includes('ÿþ') || !text.includes('/')) {
        text = buffer.toString('latin1');
      }
      parsed = parseCsv(text);
    }
  } catch (parseError: unknown) {
    const message = parseError instanceof Error ? parseError.message : 'Erro de parse desconhecido';
    return NextResponse.json(
      { error: `Falha ao processar o arquivo: ${message}` },
      { status: 422 }
    );
  }

  if (parsed.length === 0) {
    // Registrar log de falha mesmo quando não extrai nada
    await supabase.from('itau_sync_logs').insert({
      user_id: user.id,
      status: 'failed',
      file_name: file.name,
      source_type: extension,
      records_total: 0,
      records_duplicate: 0,
      records_error: 0,
      error_message: 'Nenhum lançamento encontrado no arquivo. Verifique se o extrato é do Itaú no formato padrão.',
    });

    return NextResponse.json(
      { error: 'Nenhum lançamento encontrado no arquivo. Verifique se o extrato é do Itaú no formato padrão.' },
      { status: 422 }
    );
  }

  // 5. Inserir com deduplicação via SHA-256 + ON CONFLICT DO NOTHING
  const result: UploadResult = {
    inserted: 0,
    duplicates: 0,
    errors: 0,
    total: parsed.length,
    transactions: parsed,
  };

  for (const tx of parsed) {
    const sourceHash = buildSourceHash(user.id, tx.date, tx.description, tx.amount);

    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        category: tx.category,
        icon: tx.icon,
        source_hash: sourceHash,
        source_type: extension,
      });

    if (!insertError) {
      result.inserted++;
    } else if (insertError.code === '23505') {
      // Unique constraint violation = duplicata
      result.duplicates++;
    } else {
      result.errors++;
    }
  }

  // 6. Recalcular e atualizar saldos se houve inserções
  if (result.inserted > 0) {
    const { data: allTx } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id);

    if (allTx && allTx.length > 0) {
      let total = 0;
      let income = 0;
      let expense = 0;

      for (const t of allTx) {
        const amt = parseFloat(t.amount);
        total += amt;
        if (amt > 0) income += amt;
        else expense += Math.abs(amt);
      }

      const { data: balances } = await supabase
        .from('balances')
        .select('id, type')
        .eq('user_id', user.id);

      const upsertBalance = async (type: string, label: string, value: number, icon: string) => {
        const existing = (balances || []).find((b) => b.type === type);
        if (existing) {
          await supabase.from('balances').update({ amount: value }).eq('id', existing.id);
        } else {
          await supabase.from('balances').insert({
            user_id: user.id, label, amount: value, trend: '+0.0%', icon, type,
          });
        }
      };

      await Promise.all([
        upsertBalance('total', 'Saldo Total', total, 'Wallet'),
        upsertBalance('income', 'Receitas', income, 'ArrowUpCircle'),
        upsertBalance('expense', 'Despesas', expense, 'ArrowDownCircle'),
      ]);
    }
  }

  // 7. Registrar log de operação no banco
  const logStatus = result.errors > 0 && result.inserted === 0 ? 'failed' : 'success';
  await supabase.from('itau_sync_logs').insert({
    user_id: user.id,
    status: logStatus,
    file_name: file.name,
    source_type: extension,
    records_synced: result.inserted,
    records_total: result.total,
    records_duplicate: result.duplicates,
    records_error: result.errors,
    error_message: result.errors > 0
      ? `${result.errors} lançamento(s) não puderam ser inseridos.`
      : null,
  });

  return NextResponse.json({
    success: true,
    fileName: file.name,
    total: result.total,
    inserted: result.inserted,
    duplicates: result.duplicates,
    errors: result.errors,
    message: result.inserted > 0
      ? `${result.inserted} lançamento(s) importado(s) com sucesso.${result.duplicates > 0 ? ` ${result.duplicates} duplicata(s) ignorada(s).` : ''}`
      : `Nenhum novo lançamento. ${result.duplicates} já existem no banco.`,
  });
}
