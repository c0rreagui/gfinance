/**
 * Script para processar o extrato PDF real e gerar o script SQL de inserção/sincronização.
 * Isso garante que o banco de dados do Supabase tenha os dados reais imediatamente.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PDFParse } = require('pdf-parse');

const USERS = [
  '700fb977-fe5a-46cb-afd5-b477a4daca57', // guilherme@guilherme.com
  '4ae31623-b7ba-4b09-89b7-beab24b10325'  // guilhermecorreasp11@gmail.com
];

function buildSourceHash(userId, date, description, amount) {
  const normalized = `${userId}|${date.substring(0, 10)}|${description.trim().toLowerCase()}|${amount.toFixed(2)}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function inferCategory(description) {
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

  return { category: 'Outros', icon: 'Circle' };
}

async function main() {
  const pdfPath = 'C:\\Users\\guico\\Downloads\\itau_extrato_012026.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`Erro: PDF não encontrado em ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Carregando extrato de: ${pdfPath}`);
  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  const result = await parser.getText();
  const text = result.text;

  const lineRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/gm;
  let match;
  const rawTransactions = [];

  while ((match = lineRegex.exec(text)) !== null) {
    const [, rawDate, rawDesc, rawAmount] = match;
    const description = rawDesc.trim();

    if (/^SALDO DO DIA$/i.test(description)) continue;

    const [day, month, year] = rawDate.split('/');
    const isoDate = `${year}-${month}-${day}T12:00:00.000Z`;

    const amountStr = rawAmount.replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) continue;

    const { category, icon } = inferCategory(description);
    rawTransactions.push({ date: isoDate, description, amount, category, icon });
  }

  console.log(`Encontradas ${rawTransactions.length} transações no extrato.`);

  let sql = '-- Script de sincronização automática de transações\n';
  sql += 'BEGIN;\n\n';

  for (const userId of USERS) {
    sql += `-- ==========================================================================\n`;
    sql += `-- PROCESSANDO USUÁRIO: ${userId}\n`;
    sql += `-- ==========================================================================\n\n`;

    let total = 0;
    let income = 0;
    let expense = 0;

    for (const tx of rawTransactions) {
      const sourceHash = buildSourceHash(userId, tx.date, tx.description, tx.amount);
      const safeDesc = tx.description.replace(/'/g, "''");
      const safeCat = tx.category.replace(/'/g, "''");
      
      sql += `INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) \n`;
      sql += `VALUES (gen_random_uuid(), '${userId}', '${tx.date}', '${safeDesc}', '${safeCat}', ${tx.amount}, '${tx.icon}', now(), '${sourceHash}', 'pdf')\n`;
      sql += `ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;\n\n`;

      total += tx.amount;
      if (tx.amount > 0) income += tx.amount;
      else expense += Math.abs(tx.amount);
    }

    // Gerar queries de balance
    sql += `-- Atualizar saldos para o usuário\n`;
    sql += `DELETE FROM public.balances WHERE user_id = '${userId}';\n\n`;
    
    // Total
    sql += `INSERT INTO public.balances (id, user_id, label, amount, trend, icon, type, created_at) \n`;
    sql += `VALUES (gen_random_uuid(), '${userId}', 'Saldo Total', ${total}, '+0.0%', 'Wallet', 'total', now());\n\n`;

    // Income
    sql += `INSERT INTO public.balances (id, user_id, label, amount, trend, icon, type, created_at) \n`;
    sql += `VALUES (gen_random_uuid(), '${userId}', 'Receitas', ${income}, '+0.0%', 'ArrowUpCircle', 'income', now());\n\n`;

    // Expense
    sql += `INSERT INTO public.balances (id, user_id, label, amount, trend, icon, type, created_at) \n`;
    sql += `VALUES (gen_random_uuid(), '${userId}', 'Despesas', ${expense}, '+0.0%', 'ArrowDownCircle', 'expense', now());\n\n`;

    // Inserir log de sync bem sucedido
    sql += `-- Log de sincronização\n`;
    sql += `INSERT INTO public.itau_sync_logs (user_id, status, file_name, source_type, records_synced, records_total, records_duplicate, records_error, created_at) \n`;
    sql += `VALUES ('${userId}', 'success', 'itau_extrato_012026.pdf', 'pdf', ${rawTransactions.length}, ${rawTransactions.length}, 0, 0, now());\n\n`;
  }

  sql += 'COMMIT;\n';

  const outPath = path.resolve(__dirname, 'insert_transactions.sql');
  fs.writeFileSync(outPath, sql);
  console.log(`SQL gerado com sucesso em: ${outPath}`);
}

main().catch(console.error);
