/**
 * src/lib/custom-llm.ts
 *
 * Módulo de Integração com LLMs Customizadas (como Ollama Cloud, Ollama Local e OpenAI)
 * utilizando o padrão de API compatível com OpenAI (POST /v1/chat/completions).
 * Suporta o loop de Function Calling traduzindo os esquemas do Gemini em tempo real.
 */

import { executeFinancialTool, geminiTools } from './gemini';
import { executeWorkTool, workTools } from './gemini-work';
import { executeHubTool, hubTools } from './gemini-hub';
import { reconcileBalances } from './reconcile';

// Traduz as ferramentas declaradas para o padrão do Gemini para o formato OpenAI
function convertToOpenAITools(geminiToolsList: any[]): any[] {
  const openAITools: any[] = [];
  if (!geminiToolsList || !Array.isArray(geminiToolsList)) return openAITools;

  for (const toolGroup of geminiToolsList) {
    if (toolGroup.functionDeclarations && Array.isArray(toolGroup.functionDeclarations)) {
      for (const fd of toolGroup.functionDeclarations) {
        const parameters = JSON.parse(JSON.stringify(fd.parameters || { type: 'object', properties: {} }));
        sanitizeParameters(parameters);

        openAITools.push({
          type: 'function',
          function: {
            name: fd.name,
            description: fd.description,
            parameters: parameters
          }
        });
      }
    }
  }
  return openAITools;
}

function sanitizeParameters(param: any) {
  if (!param || typeof param !== 'object') return;
  if (param.type) {
    param.type = String(param.type).toLowerCase();
  }
  if (param.properties) {
    for (const key of Object.keys(param.properties)) {
      sanitizeParameters(param.properties[key]);
    }
  }
  if (param.items) {
    sanitizeParameters(param.items);
  }
}

export interface CustomLLMConfig {
  provider: string;
  apiUrl?: string | null;
  apiKey?: string | null;
  model: string;
}

export async function generateCustomLLMResponse(
  query: string,
  chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
  module: 'finance' | 'work' | 'hub',
  llmConfig: CustomLLMConfig,
  supabaseClient: any,
  systemPrompt: string
): Promise<string> {
  // 1. Resolver URL do endpoint compatível com OpenAI chat com fallback para provedores conhecidos
  let endpoint = llmConfig.apiUrl || '';
  if (!endpoint) {
    if (llmConfig.provider === 'ollama') {
      endpoint = 'https://api.ollama.cloud';
    } else if (llmConfig.provider === 'openai') {
      endpoint = 'https://api.openai.com';
    }
  }
  if (!endpoint.includes('/chat/completions') && !endpoint.includes('/completions')) {
    endpoint = endpoint.replace(/\/$/, '') + '/v1/chat/completions';
  }

  // 2. Resolver as Ferramentas (Tools) com base no módulo
  let activeGeminiTools: any[] = [];
  if (module === 'finance') activeGeminiTools = geminiTools;
  else if (module === 'work') activeGeminiTools = workTools;
  else if (module === 'hub') activeGeminiTools = hubTools;

  const openAITools = convertToOpenAITools(activeGeminiTools);

  // 3. Montar histórico de mensagens no formato da OpenAI
  const messages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  for (const msg of chatHistory) {
    messages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts[0].text
    });
  }

  messages.push({
    role: 'user',
    content: query
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (llmConfig.apiKey) {
    headers['Authorization'] = `Bearer ${llmConfig.apiKey}`;
  }

  let loopCount = 0;
  const MAX_LOOPS = 5;

  while (loopCount < MAX_LOOPS) {
    loopCount++;

    const payload = {
      model: llmConfig.model,
      messages,
      temperature: 0.4,
      tools: openAITools.length > 0 ? openAITools : undefined
    };

    let attempts = 0;
    const maxAttempts = 3;
    let response: Response | null = null;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.info(`[Custom LLM Call] Enviando requisição para ${endpoint} (Tentativa ${loopCount}, Envio ${attempts})`);
        
        response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000) // 30s timeout por tentativa
        });

        if (response.ok) {
          break; // Success!
        }

        const statusCode = response.status;
        const errorText = await response.text();
        lastError = new Error(`HTTP ${statusCode}: ${errorText}`);

        // Só retenta se for erro transiente (429, 502, 503, 504)
        if (statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504) {
          if (attempts < maxAttempts) {
            const delay = Math.pow(2, attempts) * 1000;
            console.warn(`[Custom LLM Retry] Erro transiente ${statusCode}. Retentando em ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else {
          // Erro definitivo (ex: 400, 401, 403, 404) -> lança imediatamente
          throw lastError;
        }
      } catch (err: any) {
        lastError = err;
        const errStr = String(err).toLowerCase();
        const isTransientNetworkError = errStr.includes('timeout') || errStr.includes('aborted') || errStr.includes('fetch failed') || errStr.includes('econnrefused');
        
        if (isTransientNetworkError && attempts < maxAttempts) {
          const delay = Math.pow(2, attempts) * 1000;
          console.warn(`[Custom LLM Retry] Falha de rede/timeout. Retentando em ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw err;
        }
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Falha ao obter resposta da LLM após múltiplas tentativas.');
    }

    const json = await response.json();
    const message = json.choices?.[0]?.message;
    if (!message) {
      throw new Error('LLM customizada retornou uma resposta com formato inválido (choices[0].message vazio).');
    }

    // Se houver chamadas de ferramentas, execute-as e continue o loop
    const toolCalls = message.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      console.info(`[Custom LLM Function Calling] Executando ${toolCalls.length} ferramenta(s) solicitada(s) pela IA.`);
      
      // Armazena a resposta da IA no histórico para contextualizar as respostas das ferramentas
      messages.push(message);

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('Usuário não identificado para rodar ferramentas.');
      const userId = user.id;

      let databaseModified = false;

      const promises = toolCalls.map(async (toolCall: any) => {
        const { name } = toolCall.function;
        let args = {};
        try {
          args = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;
        } catch (parseErr) {
          console.warn(`[Custom LLM Tool Parsing Error] Falha ao parsear argumentos da função "${name}":`, parseErr);
        }

        console.info(`[Custom LLM Tool Execution] Iniciando "${name}" com args:`, args);
        
        let toolResult: any;
        try {
          if (module === 'finance') {
            const res = await executeFinancialTool(name, args, supabaseClient, userId);
            toolResult = res.toolResult;
            if (res.databaseModified) databaseModified = true;
          } else if (module === 'work') {
            const res = await executeWorkTool(name, args, supabaseClient, userId);
            toolResult = res.toolResult;
            if (res.databaseModified) databaseModified = true;
          } else {
            const res = await executeHubTool(name, args, supabaseClient, userId);
            toolResult = res.toolResult;
            if (res.databaseModified) databaseModified = true;
          }
        } catch (execErr: any) {
          console.error(`[Custom LLM Tool Execution Error] Erro ao executar "${name}":`, execErr);
          toolResult = { success: false, error: execErr.message || 'Erro de execução da ferramenta.' };
        }

        return {
          role: 'tool',
          tool_call_id: toolCall.id,
          name,
          content: JSON.stringify(toolResult)
        };
      });

      const toolResponses = await Promise.all(promises);

      // Reconcilia saldos se houve alterações financeiras
      if (databaseModified && module === 'finance') {
        console.info('[Custom LLM Tool Execution] Alterações financeiras detectadas. Rodando reconciliação...');
        await reconcileBalances(supabaseClient, userId);
      }

      // Adiciona as respostas das ferramentas ao histórico e reinicia o loop de prompt
      messages.push(...toolResponses);
    } else {
      // Sem chamadas de ferramentas, retorne o conteúdo de texto final
      return message.content || '';
    }
  }

  throw new Error('Limite máximo de iterações de Function Calling atingido.');
}
