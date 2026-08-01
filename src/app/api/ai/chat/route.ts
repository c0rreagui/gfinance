/**
 * src/app/api/ai/chat/route.ts
 *
 * API Route unificada para o Chat do G-Finance (CFO), G-Work (CPO) e G-Hub (CoS).
 * O parâmetro `module` ('finance' | 'work' | 'hub') determina:
 * - Qual assistente é invocado
 * - Qual memória perene é lida/escrita
 * - Qual contexto de dados é injetado no prompt
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateFinancialResponse, is429Error, getFinancialSystemPrompt, parseStatementWithAI } from '@/lib/gemini';
import { generateWorkResponse, getWorkSystemPrompt } from '@/lib/gemini-work';
import { generateHubResponse, getHubSystemPrompt } from '@/lib/gemini-hub';
import { compactSessionHistory, AppModule } from '@/lib/memory';
import { generateCustomLLMResponse } from '@/lib/custom-llm';

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

  const { message, sessionId, module: rawModule, attachment } = body;
  const module: AppModule = rawModule === 'work' ? 'work' : rawModule === 'hub' ? 'hub' : 'finance';

  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'Mensagem inválida. Campo "message" é obrigatório.' },
      { status: 400 }
    );
  }

  let insertedUserMessageId: string | undefined = undefined;
  let useCustomLLM = false;
  let configuredUrl = '';
  let providerName = 'custom';

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

    // Fetch profile, AI memory, and custom LLM settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_memory, ai_memory_work, ai_memory_hub, llm_provider, llm_api_url, llm_api_key, llm_model')
      .eq('id', user.id)
      .single();

    useCustomLLM = !!(profile?.llm_provider && profile.llm_provider !== 'gemini');
    configuredUrl = profile?.llm_api_url || '';
    providerName = profile?.llm_provider || 'custom';

    const customLLMConfig = useCustomLLM ? {
      provider: profile?.llm_provider || 'custom',
      apiUrl: profile?.llm_api_url,
      apiKey: profile?.llm_api_key,
      model: profile?.llm_model || ''
    } : undefined;

    // 5.1 Processar Anexo de Extrato (PDF/Imagem) se enviado no Chat
    let queryPrompt = message;
    let extractedAttachmentData: any = null;

    if (attachment && attachment.base64) {
      try {
        console.info(`[Chat Attachment] Processando anexo de visão computacional: "${attachment.filename}" (${attachment.mimeType})`);
        const fileBuffer = Buffer.from(attachment.base64, 'base64');
        const parsedTxs = await parseStatementWithAI(
          fileBuffer,
          attachment.mimeType || 'application/pdf',
          providerToken || undefined,
          customLLMConfig
        );

        extractedAttachmentData = {
          filename: attachment.filename || 'extrato.pdf',
          count: parsedTxs.length,
          transactions: parsedTxs
        };

        const txSummaryText = parsedTxs
          .map(t => `- ${t.date}: ${t.description} (${t.amount > 0 ? '+' : ''}R$ ${t.amount.toFixed(2)}) [${t.category}]${t.isBalance ? ' (Saldo do Dia)' : ''}`)
          .join('\n');

        queryPrompt = `${message}

📄 **[EXTRATO BANCÁRIO ANEXADO PELO USUÁRIO: "${attachment.filename}"]**
Visão computacional extraiu ${parsedTxs.length} lançamentos do arquivo fornecido:
${txSummaryText}

Analise detalhadamente estes lançamentos extraídos, forneça um parecer sobre receitas, despesas e saldo final. Informe ao usuário que você pode cadastrar/conciliar estes lançamentos no banco de dados do G-Finance (usando suas ferramentas de escrita) se ele assim solicitar!`;
      } catch (attErr: any) {
        console.error('[Chat Attachment Error] Erro ao extrair anexo no chat:', attErr);
        queryPrompt = `${message}\n\n⚠️ [Aviso: Ocorreu um erro ao processar o anexo "${attachment.filename}": ${attErr.message}]`;
      }
    }

    let aiResponse: string;

    if (useCustomLLM) {
      console.info(`[AI Chat Route] Usando LLM Customizada (${profile?.llm_provider || 'custom'}) para o módulo: ${module}`);
      let systemPrompt = '';
      
      let finCtx: any = null;
      if (module === 'work') {
        systemPrompt = getWorkSystemPrompt(profile?.ai_memory_work || '');
      } else if (module === 'hub') {
        systemPrompt = getHubSystemPrompt(profile?.ai_memory_hub || '');
      } else {
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

        finCtx = {
          balances: dbBalances || [],
          transactions: dbTransactions || [],
          goals: dbGoals || [],
          reminders: dbReminders || [],
          creditCards: dbCards || []
        };

        systemPrompt = getFinancialSystemPrompt(profile?.ai_memory || '', finCtx);
      }

      try {
        aiResponse = await generateCustomLLMResponse(
          queryPrompt,
          chatHistory,
          module,
          {
            provider: profile?.llm_provider || 'custom',
            apiUrl: profile?.llm_api_url || '',
            apiKey: profile?.llm_api_key || null,
            model: profile?.llm_model || ''
          },
          supabase,
          systemPrompt
        );
      } catch (customErr: any) {
        console.warn(`[AI Chat Route] Provedor customizado falhou: ${customErr.message}. Executando fallback automático para o motor nativo Gemini.`);
        if (module === 'work') {
          aiResponse = await generateWorkResponse(queryPrompt, chatHistory, supabase, profile?.ai_memory_work || '');
        } else if (module === 'hub') {
          aiResponse = await generateHubResponse(queryPrompt, chatHistory, supabase, profile?.ai_memory_hub || '');
        } else {
          aiResponse = await generateFinancialResponse(queryPrompt, finCtx, chatHistory, providerToken || undefined, supabase, profile?.ai_memory || '');
        }
      }

    } else {
      // Usar modelo nativo do Gemini (comportamento original)
      if (module === 'work') {
        aiResponse = await generateWorkResponse(
          queryPrompt,
          chatHistory,
          supabase,
          profile?.ai_memory_work || ''
        );

      } else if (module === 'hub') {
        aiResponse = await generateHubResponse(
          queryPrompt,
          chatHistory,
          supabase,
          profile?.ai_memory_hub || ''
        );

      } else {
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
          queryPrompt,
          financialContext,
          chatHistory,
          providerToken || undefined,
          supabase,
          aiMemory
        );
      }
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
      autoCompacted,
      extractedAttachment: extractedAttachmentData
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

    const errStr = String(err).toLowerCase();
    const isGeminiError = is429Error(err) || errStr.includes('googlegenerativeai') || errStr.includes('gemini');
    
    if (isGeminiError) {
      return NextResponse.json(
        { error: 'O assistente de IA está temporariamente indisponível devido a alta demanda ou limite de requisições atingido. Por favor, aguarde alguns segundos e tente novamente.' },
        { status: 503 }
      );
    }

    if (useCustomLLM) {
      let friendlyMessage = `Não foi possível conectar ao seu provedor de IA customizado (${providerName.toUpperCase()}). `;
      const displayUrl = configuredUrl || (providerName === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com');
      
      if (errStr.includes('timeout') || errStr.includes('aborted')) {
        friendlyMessage += `A requisição para "${displayUrl}" expirou por timeout (limite de tempo excedido). Verifique se o servidor de IA está ativo e respondendo rápido o suficiente.`;
      } else if (errStr.includes('fetch failed') || errStr.includes('econnrefused')) {
        friendlyMessage += `O endereço "${displayUrl}" está inacessível ou recusou a conexão. Certifique-se de que o provedor está rodando e configurado com suporte a CORS ativo (se rodando localmente).`;
      } else if (errStr.includes('404')) {
        friendlyMessage += `O modelo selecionado não foi localizado ou o endpoint de chat está incorreto em "${displayUrl}". Verifique se o nome do modelo está digitado corretamente nos Ajustes.`;
      } else if (errStr.includes('401') || errStr.includes('403') || errStr.includes('unauthorized') || errStr.includes('forbidden')) {
        friendlyMessage += `Erro de autenticação para o host "${displayUrl}". Verifique se sua Chave de API nos Ajustes está correta.`;
      } else {
        friendlyMessage += `Detalhes técnicos: ${err.message || 'Falha de comunicação'}. Revise a URL, Chave de API e Modelo em "Ajustes".`;
      }

      return NextResponse.json(
        { error: friendlyMessage },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor ao processar chat.' },
      { status: 500 }
    );
  }
}
