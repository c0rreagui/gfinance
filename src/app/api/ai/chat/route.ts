/**
 * src/app/api/ai/chat/route.ts
 *
 * API Route unificada para o Chat do G-Finance (CFO) e G-Work (CPO).
 * O parâmetro `module` ('finance' | 'work') determina:
 * - Qual assistente é invocado (generateFinancialResponse ou generateWorkResponse)
 * - Qual memória perene é lida/escrita (ai_memory ou ai_memory_work)
 * - Qual contexto de dados é injetado no prompt
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateFinancialResponse, is429Error } from '@/lib/gemini';
import { generateWorkResponse } from '@/lib/gemini-work';
import { compactSessionHistory, AppModule } from '@/lib/memory';

export const runtime = 'nodejs';
export const maxDuration = 60; // Limite de 60 segundos para evitar timeout de processamentos paralelos/concorrentes do Gemini no Vercel

export async function POST(req: Request): Promise<NextResponse> {
  // 1. Autenticação via cookies ou Header Authorization
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

  const { message, sessionId, module: rawModule } = body;
  const module: AppModule = rawModule === 'work' ? 'work' : 'finance';

  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'Mensagem inválida. Campo "message" é obrigatório.' },
      { status: 400 }
    );
  }

  let insertedUserMessageId: string | undefined = undefined;

  try {
    // 3. Gerenciar / Criar Sessão Persistente com módulo correto
    let finalSessionId = sessionId;

    if (!finalSessionId) {
      const { data: newSession, error: createSessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: message.length > 30 ? `${message.substring(0, 27)}...` : message,
          module
        })
        .select('id')
        .single();

      if (createSessionError || !newSession) {
        throw new Error(`Falha ao provisionar sessão: ${createSessionError?.message}`);
      }
      finalSessionId = newSession.id;
    }

    // 4. Comando de compactação manual
    if (message.trim() === '/compact') {
      console.info(`[Compact] Executando compactação manual para a sessão: ${finalSessionId}`);
      const compactResult = await compactSessionHistory(supabase, user.id, finalSessionId, module);
      
      if (!compactResult.success) {
        return NextResponse.json(
          { error: compactResult.error || 'Falha ao processar compactação.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        response: 'Consciência consolidada com sucesso! Toda a bagagem de conhecimento e insights desta conversa foram compactados e integrados à sua memória de longo prazo permanente.',
        compacted: true,
        sessionId: finalSessionId
      });
    }

    // 5. Salvar a mensagem do usuário
    const { data: insertedUserMsg, error: insertUserMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: finalSessionId,
        user_id: user.id,
        role: 'user',
        content: message
      })
      .select('id')
      .single();

    if (insertUserMsgError || !insertedUserMsg) {
      throw new Error(`Falha ao registrar mensagem do usuário: ${insertUserMsgError?.message || 'Nenhum dado retornado'}`);
    }

    insertedUserMessageId = insertedUserMsg.id;

    // 6. Buscar histórico ativo da sessão (sliding window)
    const { data: dbHistory, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', finalSessionId)
      .eq('is_compacted', false)
      .order('created_at', { ascending: true });

    if (historyError) {
      throw new Error(`Falha ao resgatar histórico de mensagens: ${historyError.message}`);
    }

    const chatHistory = (dbHistory || [])
      .filter((msg) => msg.content !== message)
      .map((msg) => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.content }]
      }));

    let aiResponse: string;

    if (module === 'work') {
      // =====================================================================
      // G-WORK — CPO Assistant
      // =====================================================================
      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_memory_work')
        .eq('id', user.id)
        .single();

      const aiMemoryWork = profile?.ai_memory_work || '';

      aiResponse = await generateWorkResponse(
        message,
        chatHistory,
        supabase,
        aiMemoryWork
      );

    } else {
      // =====================================================================
      // G-FINANCE — CFO Assistant
      // =====================================================================
      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_memory')
        .eq('id', user.id)
        .single();

      const aiMemory = profile?.ai_memory || '';

      const [
        { data: dbBalances },
        { data: dbTransactions },
        { data: dbGoals },
        { data: dbReminders },
        { data: dbCards }
      ] = await Promise.all([
        supabase.from('balances').select('label, amount, trend, icon, type').eq('user_id', user.id).limit(20),
        supabase.from('transactions').select('date, description, amount, category, card_id').eq('user_id', user.id).order('date', { ascending: false }).limit(80),
        supabase.from('goals').select('name, target_amount, current_amount').eq('user_id', user.id).limit(20),
        supabase.from('reminders').select('title, due_date, amount, urgency, card_id').eq('user_id', user.id).eq('paid', false).order('due_date', { ascending: true }).limit(5),
        supabase.from('credit_cards').select('card_name, card_limit, closing_day, due_day, last_four').eq('user_id', user.id)
      ]);

      const financialContext = {
        balances: dbBalances || [],
        transactions: dbTransactions || [],
        goals: dbGoals || [],
        reminders: dbReminders || [],
        creditCards: dbCards || []
      };

      aiResponse = await generateFinancialResponse(
        message,
        financialContext,
        chatHistory,
        providerToken || undefined,
        supabase,
        aiMemory
      );
    }

    // 7. Auto-Compactação se o histórico estiver ficando longo
    const activeMsgCount = (dbHistory || []).length + 1;
    let autoCompacted = false;

    if (activeMsgCount > 12) {
      console.info(`[Auto-Compaction] Limite atingido (${activeMsgCount} msgs). Compactando sessão ${finalSessionId} (${module})...`);
      const compactResult = await compactSessionHistory(supabase, user.id, finalSessionId, module);
      
      if (compactResult.success) {
        autoCompacted = true;
        aiResponse += `\n\n*(Esta conversa atingiu o limite de contexto e foi auto-compactada para preservar performance.)*`;
      }
    }

    // 8. Salvar a resposta da IA
    const { error: insertModelMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: finalSessionId,
        user_id: user.id,
        role: 'model',
        content: aiResponse
      });

    if (insertModelMsgError) {
      throw new Error(`Falha ao registrar mensagem do assistente: ${insertModelMsgError.message}`);
    }

    // 9. Atualizar timestamp da sessão
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', finalSessionId);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      sessionId: finalSessionId,
      module,
      autoCompacted
    });

  } catch (err: any) {
    console.error('[AI Chat API] Erro ao gerar resposta:', err);

    if (insertedUserMessageId) {
      try {
        await supabase.from('chat_messages').delete().eq('id', insertedUserMessageId);
        console.info(`[AI Chat API Rollback] Mensagem do usuário ${insertedUserMessageId} removida devido a falha na IA.`);
      } catch (rollbackErr) {
        console.error('[AI Chat API Rollback] Erro ao executar rollback de mensagem:', rollbackErr);
      }
    }

    if (is429Error(err)) {
      return NextResponse.json(
        { error: 'O limite temporário de requisições foi atingido. Por favor, aguarde alguns segundos antes de tentar novamente.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor ao processar chat.' },
      { status: 500 }
    );
  }
}
