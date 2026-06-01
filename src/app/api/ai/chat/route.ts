/**
 * src/app/api/ai/chat/route.ts
 *
 * API Route para o Chat do Analista Financeiro (Gemini AI Brain).
 * Autentica o usuário, recupera seus dados reais do Supabase (respeitando o RLS),
 * gerencia o histórico de sessões persistentes, injeta a memória global perene (profiles.ai_memory)
 * e executa a compactação de histórico (/compact manual e automática).
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateFinancialResponse } from '@/lib/gemini';
import { compactSessionHistory } from '@/lib/memory';

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

  const providerToken = req.headers.get('x-provider-token') || session?.provider_token;

  // 2. Extrair dados da requisição
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Body inválido. Forneça os parâmetros corretos.' },
      { status: 400 }
    );
  }

  const { message, sessionId } = body;
  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'Mensagem inválida. Campo "message" é obrigatório.' },
      { status: 400 }
    );
  }

  try {
    // 3. Gerenciar / Criar Sessão Persistente caso não exista
    let finalSessionId = sessionId;

    if (!finalSessionId) {
      // Auto-provisionar uma nova sessão de conversa para o usuário
      const { data: newSession, error: createSessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: message.length > 30 ? `${message.substring(0, 27)}...` : message
        })
        .select('id')
        .single();

      if (createSessionError || !newSession) {
        throw new Error(`Falha ao provisionar sessão: ${createSessionError?.message}`);
      }
      finalSessionId = newSession.id;
    }

    // 4. Se a mensagem for o comando estrito de compactação, intercepta e roda o processo
    if (message.trim() === '/compact') {
      console.info(`[Compact] Executando compactação manual para a sessão: ${finalSessionId}`);
      const compactResult = await compactSessionHistory(supabase, user.id, finalSessionId);
      
      if (!compactResult.success) {
        return NextResponse.json(
          { error: compactResult.error || 'Falha ao processar compactação.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        response: 'Consciência consolidada com sucesso! Toda a bagagem de conhecimento e insights desta conversa foram compactados e integrados à sua memória de longo prazo permanente do perfil.',
        compacted: true,
        sessionId: finalSessionId
      });
    }

    // 5. Salvar a nova mensagem do usuário no banco de dados para auditoria perene
    const { error: insertUserMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: finalSessionId,
        user_id: user.id,
        role: 'user',
        content: message
      });

    if (insertUserMsgError) {
      throw new Error(`Falha ao registrar mensagem do usuário: ${insertUserMsgError.message}`);
    }

    // 6. Buscar memória perene do usuário do seu perfil Supabase
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_memory')
      .eq('id', user.id)
      .single();

    const aiMemory = profile?.ai_memory || '';

    // 7. Buscar histórico ativo da sessão (mensagens que NÃO foram compactadas para sliding window)
    const { data: dbHistory, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', finalSessionId)
      .eq('is_compacted', false)
      .order('created_at', { ascending: true });

    if (historyError) {
      throw new Error(`Falha ao resgatar histórico de mensagens: ${historyError.message}`);
    }

    // Mapear para o formato esperado pelo generateFinancialResponse
    const chatHistory = (dbHistory || [])
      .filter((msg) => msg.content !== message) // Excluir a mensagem atual do histórico já inserido para evitar redundância na resposta
      .map((msg) => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.content }]
      }));

    // 8. Buscar contexto de finanças reais do Guilherme (RLS do Postgres garante o isolamento)
    const [
      { data: dbBalances },
      { data: dbTransactions },
      { data: dbGoals },
      { data: dbReminders }
    ] = await Promise.all([
      supabase.from('balances').select('label, amount, trend, icon, type').eq('user_id', user.id).limit(20),
      supabase.from('transactions').select('date, description, amount, category').eq('user_id', user.id).order('date', { ascending: false }).limit(80),
      supabase.from('goals').select('name, target_amount, current_amount').eq('user_id', user.id).limit(20),
      supabase.from('reminders').select('title, due_date, amount, urgency').eq('user_id', user.id).eq('paid', false).order('due_date', { ascending: true }).limit(5)
    ]);

    const financialContext = {
      balances: dbBalances || [],
      transactions: dbTransactions || [],
      goals: dbGoals || [],
      reminders: dbReminders || []
    };

    // 9. Invocar a IA injetando a Memória Permanente Global
    let aiResponse = await generateFinancialResponse(
      message,
      financialContext,
      chatHistory,
      providerToken || undefined,
      supabase,
      aiMemory
    );

    // 10. Auto-Compactação se o histórico estiver ficando longo (evita estouro de tokens)
    // Contar quantas mensagens ativas temos na sessão agora
    const activeMsgCount = (dbHistory || []).length + 1; // histórico + mensagem atual do usuário
    let autoCompacted = false;

    if (activeMsgCount > 12) {
      console.info(`[Auto-Compaction] Limite atingido (${activeMsgCount} mensagens). Compactando sessão: ${finalSessionId}`);
      const compactResult = await compactSessionHistory(supabase, user.id, finalSessionId);
      
      if (compactResult.success) {
        autoCompacted = true;
        aiResponse += `\n\n*(Nota: Esta conversa estava longa e atingiu o limite de tokens da sessão. Rodei uma auto-compactação e integrei todo o nosso contexto na minha memória perene global permanente para manter as respostas rápidas!)*`;
      }
    }

    // 11. Salvar a resposta gerada pela IA na tabela chat_messages
    const { error: insertModelMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: finalSessionId,
        user_id: user.id,
        role: 'model',
        content: aiResponse
      });

    if (insertModelMsgError) {
      throw new Error(`Falha ao registrar mensagem do analista: ${insertModelMsgError.message}`);
    }

    // 12. Atualizar o timestamp de modificação da sessão para ordenação na sidebar
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', finalSessionId);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      sessionId: finalSessionId,
      autoCompacted
    });

  } catch (err: any) {
    console.error('[Gemini Chat API] Erro catastrófico ao gerar resposta:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor ao processar chat.' },
      { status: 500 }
    );
  }
}
