/**
 * src/app/api/ai/chat/route.ts
 *
 * API Route para o Chat do Analista Financeiro (Gemini AI Brain).
 * Autentica o usuário, recupera seus dados reais do Supabase (respeitando o RLS)
 * e gera respostas contextuais ricas e analíticas via Gemini 1.5 Flash.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateFinancialResponse } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<NextResponse> {
  // 1. Autenticação via cookies ou Header Authorization com o Supabase Server Client
  const authHeader = req.headers.get('Authorization');
  const supabaseToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const supabase = await createSupabaseServerClient();

  if (supabaseToken) {
    await supabase.auth.setSession({
      access_token: supabaseToken,
      refresh_token: ''
    });
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const user = session?.user;

  if (sessionError || !user) {
    return NextResponse.json(
      { error: 'Sessão inválida ou expirada. Faça login novamente.' },
      { status: 401 }
    );
  }

  // Permite obter o provider_token do header personalizado enviado pelo client-side
  const providerToken = req.headers.get('x-provider-token') || session?.provider_token;

  // 2. Extrair dados da requisição
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Body inválido. Forneça o campo "message".' },
      { status: 400 }
    );
  }

  const { message, history } = body;
  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'Mensagem inválida. Campo "message" é obrigatório.' },
      { status: 400 }
    );
  }

  // Limitar o histórico de chat para as últimas 20 mensagens (10 turnos) para respeitar o sliding window
  const CHAT_HISTORY_LIMIT = 20;
  const chatHistory = Array.isArray(history) 
    ? history.slice(-CHAT_HISTORY_LIMIT) 
    : [];

  try {
    // 3. Buscar dados financeiros reais do usuário no Supabase com limites estritos
    // O cliente foi gerado via Server Client com o cookie do usuário, logo o RLS do Postgres é respeitado nativamente.
    const [
      { data: dbBalances },
      { data: dbTransactions },
      { data: dbGoals },
      { data: dbReminders }
    ] = await Promise.all([
      // Saldos consolidados (limitado para proteção de recursos)
      supabase
        .from('balances')
        .select('label, amount, trend, icon, type')
        .eq('user_id', user.id)
        .limit(20),
        
      // Últimas 80 transações (janela de contexto móvel razoável)
      supabase
        .from('transactions')
        .select('date, description, amount, category')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(80),
        
      // Metas de investimento (limitado para proteção de recursos)
      supabase
        .from('goals')
        .select('name, target_amount, current_amount')
        .eq('user_id', user.id)
        .limit(20),
        
      // Contas a pagar pendentes
      supabase
        .from('reminders')
        .select('title, due_date, amount, urgency')
        .eq('user_id', user.id)
        .eq('paid', false)
        .order('due_date', { ascending: true })
        .limit(5)
    ]);

    // 4. Estruturar o contexto financeiro consolidado
    const financialContext = {
      balances: dbBalances || [],
      transactions: dbTransactions || [],
      goals: dbGoals || [],
      reminders: dbReminders || []
    };

    // 5. Chamar a IA para gerar os insights
    const aiResponse = await generateFinancialResponse(
      message,
      financialContext,
      chatHistory,
      providerToken || undefined,
      supabase
    );

    return NextResponse.json({
      success: true,
      response: aiResponse
    });

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido no servidor';
    console.error('[Gemini Chat API] Erro ao gerar resposta financeira:', err);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
