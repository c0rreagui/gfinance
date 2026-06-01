/**
 * src/lib/memory.ts
 *
 * Módulo de Inteligência Personalizada e Compactação de Histórico.
 * Consolida as conversas de sessões ativas na memória perene global do usuário (profiles.ai_memory)
 * e marca as mensagens como compactadas, otimizando o consumo de tokens na API.
 */

import { getGeminiClient } from './gemini';

interface ChatMessageRow {
  role: 'user' | 'model';
  content: string;
}

export async function compactSessionHistory(
  supabaseClient: any,
  userId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string; newMemory?: string }> {
  try {
    console.info(`[Memory] Iniciando compactação para sessão ${sessionId} do usuário ${userId}`);

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

    // 2. Buscar a memória permanente global do perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('ai_memory')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Falha ao buscar perfil do usuário: ${profileError.message}`);
    }

    const currentMemory = profile?.ai_memory || '';

    // 3. Formatamos o histórico para a IA analisar
    const formattedHistory = messages
      .map((m: ChatMessageRow) => `${m.role === 'user' ? 'Usuário' : 'Gemini Brain'}: ${m.content}`)
      .join('\n');

    // 4. Instanciar o Gemini Client para fazer a fusão e compressão semântica
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash', // Utiliza o modelo mais rápido e preciso para summarização
      generationConfig: {
        temperature: 0.2, // Baixa temperatura para evitar alucinações e prezar por exatidão
        maxOutputTokens: 1024,
      }
    });

    const compactionPrompt = `
      Você é o "Memory Core" do G-Finance, projetado para consolidar conversas ativas na "Memória Permanente de Longo Prazo" do usuário.
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
      1. Extraia e conserve fatos financeiros críticos discutidos (metas declaradas, despesas ou orçamentos mencionados, preferências de investimento, dúvidas recorrentes).
      2. Mantenha os aprendizados do usuário de forma concisa.
      3. Funda as redundâncias. Se algo já está na Memória Global e se manteve inalterado, não duplique.
      4. Escreva a memória atualizada em português brasileiro (pt-BR) de forma elegante, estruturada e limpa (usando tópicos rápidos se apropriado).
      5. Limite a memória final a no máximo 2500 caracteres para preservar a janela de contexto.
      6. Retorne EXCLUSIVAMENTE a memória consolidada final, sem introduções ou explicações.
    `;

    console.info('[Memory] Enviando prompt de compactação para o Gemini...');
    const result = await model.generateContent(compactionPrompt);
    const updatedMemory = result.response.text().trim();

    if (!updatedMemory) {
      throw new Error('Gemini retornou uma memória de compactação vazia.');
    }

    console.info(`[Memory] Compactação bem sucedida! Tamanho da memória: ${updatedMemory.length} caracteres.`);

    // 5. Salvar a nova memória integrada no perfil do usuário
    const { error: updateProfileError } = await supabaseClient
      .from('profiles')
      .update({ ai_memory: updatedMemory })
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

    // 7. Inserir uma mensagem especial de confirmação e conscientização de sistema na conversa
    const compactionIndicator = `[Histórico compactado! Toda a bagagem de conhecimento e aprendizados desta conversa foi integrada à sua memória perene global permanente.]`;
    
    const { error: insertSystemMsgError } = await supabaseClient
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        role: 'model',
        content: compactionIndicator,
        is_compacted: false // Essa mensagem de aviso de compactação deve ficar legível
      });

    if (insertSystemMsgError) {
      console.warn(`[Memory] Não foi possível inserir aviso de compactação na sessão: ${insertSystemMsgError.message}`);
    }

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
