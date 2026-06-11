/**
 * src/lib/memory.ts
 *
 * Módulo de Inteligência Personalizada e Compactação de Histórico.
 * Consolida as conversas de sessões ativas na memória perene global do usuário.
 * Suporta dois módulos isolados:
 * - 'finance': salva em profiles.ai_memory (CFO Assistant)
 * - 'work': salva em profiles.ai_memory_work (CPO Assistant)
 */

import { getGeminiClient, withRetry } from './gemini';

interface ChatMessageRow {
  role: 'user' | 'model';
  content: string;
}

export type AppModule = 'finance' | 'work';

export async function compactSessionHistory(
  supabaseClient: any,
  userId: string,
  sessionId: string,
  module: AppModule = 'finance'
): Promise<{ success: boolean; error?: string; newMemory?: string }> {
  try {
    console.info(`[Memory] Iniciando compactação (${module}) para sessão ${sessionId} do usuário ${userId}`);

    // 1. Buscar todas as mensagens não compactadas desta sessão
    const { data: messages, error: msgError } = await supabaseClient
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .eq('is_compacted', false)
      .order('created_at', { ascending: true });

    if (msgError) {
      throw new Error(`Falha ao buscar mensagens da sessão: ${msgError.message}`);
    }

    if (!messages || messages.length === 0) {
      console.info('[Memory] Nenhuma mensagem pendente de compactação.');
      return { success: true };
    }

    // 2. Buscar a memória permanente do perfil do usuário (coluna correta por módulo)
    const memoryColumn = module === 'work' ? 'ai_memory_work' : 'ai_memory';
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select(memoryColumn)
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Falha ao buscar perfil do usuário: ${profileError.message}`);
    }

    const currentMemory = profile?.[memoryColumn] || '';

    // 3. Formatamos o histórico para a IA analisar
    const formattedHistory = messages
      .map((m: ChatMessageRow) => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
      .join('\n');

    // 4. Instanciar o Gemini Client para fazer a fusão e compressão semântica
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      }
    });

    const moduleLabel = module === 'work'
      ? 'G-Work (tarefas, projetos, execução de produto)'
      : 'G-Finance (finanças pessoais, gastos, metas)';

    const compactionPrompt = `
      Você é o "Memory Core" do ${moduleLabel}, projetado para consolidar conversas ativas na "Memória Permanente de Longo Prazo" do usuário.
      Sua tarefa é analisar o Histórico Recente de Diálogo e integrá-lo de forma compacta, inteligente e fluida na Memória Permanente Global Atual.
      
      ---
      MEMÓRIA PERMANENTE GLOBAL ATUAL:
      ${currentMemory || 'Ainda vazia. Este é o início do relacionamento.'}
      ---
      
      ---
      HISTÓRICO RECENTE DE DIÁLOGO A SER INTEGRADO:
      ${formattedHistory}
      ---
      
      Regras estritas de consolidação:
      1. Extraia e conserve fatos críticos discutidos (decisões tomadas, preferências do usuário, contexto de projetos/tarefas ou dados financeiros mencionados).
      2. Mantenha os aprendizados do usuário de forma concisa.
      3. Funda as redundâncias. Se algo já está na Memória Global e se manteve inalterado, não duplique.
      4. Escreva a memória atualizada em português brasileiro (pt-BR) de forma elegante, estruturada e limpa (usando tópicos rápidos se apropriado).
      5. Limite a memória final a no máximo 2500 caracteres para preservar a janela de contexto.
      6. Retorne EXCLUSIVAMENTE a memória consolidada final, sem introduções ou explicações.
    `;

    console.info('[Memory] Enviando prompt de compactação para o Gemini...');
    const result = await withRetry(() => model.generateContent(compactionPrompt));
    const updatedMemory = result.response.text().trim();

    if (!updatedMemory) {
      throw new Error('Gemini retornou uma memória de compactação vazia.');
    }

    console.info(`[Memory] Compactação bem sucedida! Módulo: ${module}, tamanho: ${updatedMemory.length} caracteres.`);

    // 5. Salvar a nova memória integrada no perfil do usuário (coluna correta por módulo)
    const { error: updateProfileError } = await supabaseClient
      .from('profiles')
      .update({ [memoryColumn]: updatedMemory })
      .eq('id', userId);

    if (updateProfileError) {
      throw new Error(`Falha ao salvar nova memória no perfil: ${updateProfileError.message}`);
    }

    // 6. Marcar as mensagens compactadas no histórico como is_compacted = true
    const { error: updateMsgError } = await supabaseClient
      .from('chat_messages')
      .update({ is_compacted: true })
      .eq('session_id', sessionId)
      .eq('is_compacted', false);

    if (updateMsgError) {
      throw new Error(`Falha ao atualizar status das mensagens de chat: ${updateMsgError.message}`);
    }

    // 7. Inserir mensagem de confirmação de sistema na conversa
    const compactionIndicator = `[Histórico compactado! Toda a bagagem de conhecimento e aprendizados desta conversa foi integrada à sua memória perene global permanente.]`;
    
    await supabaseClient
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        role: 'model',
        content: compactionIndicator,
        is_compacted: false
      });

    return {
      success: true,
      newMemory: updatedMemory
    };

  } catch (err: any) {
    console.error('[Memory] Erro crítico na compactação:', err);
    return {
      success: false,
      error: err.message || 'Erro de compactação desconhecido.'
    };
  }
}
