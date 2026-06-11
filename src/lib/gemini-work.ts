/**
 * src/lib/gemini-work.ts
 *
 * Módulo CPO Assistant — Gemini AI Brain do G-Work.
 * Fornece ao assistente:
 * 1. Prompt de sistema focado em produto, tarefas e projetos.
 * 2. Function Calling com autonomia total sobre tasks, projects, transcriptions e ai_insights.
 * 3. Isolamento completo dos dados financeiros do G-Finance.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const CONVERSATIONAL_MODEL = 'gemini-flash-latest';

const apiKey = process.env.GEMINI_API_KEY;

function getGeminiClient(): GoogleGenerativeAI {
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    throw new Error(
      'GEMINI_API_KEY não configurada. Adicione sua chave de API no arquivo .env.local.'
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

// ---------------------------------------------------------------------------
// Helpers para Tratamento de Erros, Quota e Retentativas com Backoff
// ---------------------------------------------------------------------------
export function is429Error(err: any): boolean {
  if (!err) return false;
  
  if (
    err.status === 429 ||
    err.statusCode === 429 ||
    err.response?.status === 429 ||
    err.response?.statusCode === 429
  ) {
    return true;
  }
  
  const errStr = String(err).toLowerCase();
  const errMsg = err.message ? String(err.message).toLowerCase() : '';
  const errStatus = err.status ? String(err.status) : '';
  
  const keywords = ['429', 'resource_exhausted', 'resource exhausted', 'quota', 'rate limit', 'too many requests'];
  return keywords.some(
    (keyword) => errStr.includes(keyword) || errMsg.includes(keyword) || errStatus === '429'
  );
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      if (is429Error(err) && attempt < 3) {
        attempt++;
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(`[Gemini Retry] Rate limit (429) detectado. Tentativa ${attempt} de 3 de reprocessamento em ${delay}ms...`, err);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}

export async function sendMessageWithRetry(chat: any, message: string | any[]): Promise<any> {
  return withRetry(() => chat.sendMessage(message));
}

// ---------------------------------------------------------------------------
// Tools do G-Work — Autonomia total sobre tasks, projects, transcriptions
// ---------------------------------------------------------------------------
const workTools = [
  {
    functionDeclarations: [
      // ---- TASKS ----
      {
        name: 'list_work_tasks',
        description: 'Lista as tarefas, stories, épicos e features do usuário no G-Work. Permite filtrar por status, prioridade, tipo ou projeto.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            status: { type: SchemaType.STRING, description: 'Filtrar pelo status: backlog, todo, in_progress, in_review, done' },
            priority: { type: SchemaType.STRING, description: 'Filtrar por prioridade: low, medium, high, critical' },
            type: { type: SchemaType.STRING, description: 'Filtrar por tipo: epic, feature, story, task' },
            project_id: { type: SchemaType.STRING, description: 'UUID do projeto para filtrar' },
            search: { type: SchemaType.STRING, description: 'Texto de busca no título ou descrição' },
            limit: { type: SchemaType.NUMBER, description: 'Limite máximo de registros (padrão 50)' }
          }
        }
      },
      {
        name: 'create_work_task',
        description: 'Cria um novo item de trabalho (tarefa, story, épico ou feature) no G-Work.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, description: 'Título obrigatório do item de trabalho' },
            description: { type: SchemaType.STRING, description: 'Descrição detalhada opcional' },
            type: { type: SchemaType.STRING, description: 'Tipo: epic, feature, story ou task (padrão: task)' },
            status: { type: SchemaType.STRING, description: 'Status inicial: backlog, todo, in_progress, in_review, done (padrão: todo)' },
            priority: { type: SchemaType.STRING, description: 'Prioridade: low, medium, high ou critical (padrão: medium)' },
            project_id: { type: SchemaType.STRING, description: 'UUID do projeto (opcional)' },
            parent_id: { type: SchemaType.STRING, description: 'UUID do item pai para criar sub-item (opcional)' },
            due_date: { type: SchemaType.STRING, description: 'Prazo no formato ISO (YYYY-MM-DD, opcional)' }
          },
          required: ['title']
        }
      },
      {
        name: 'update_work_task',
        description: 'Atualiza campos de um item de trabalho existente no G-Work (status, título, prioridade, projeto, etc.).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            task_id: { type: SchemaType.STRING, description: 'UUID único do item a ser atualizado' },
            title: { type: SchemaType.STRING, description: 'Novo título opcional' },
            description: { type: SchemaType.STRING, description: 'Nova descrição opcional' },
            type: { type: SchemaType.STRING, description: 'Novo tipo: epic, feature, story, task' },
            status: { type: SchemaType.STRING, description: 'Novo status: backlog, todo, in_progress, in_review, done' },
            priority: { type: SchemaType.STRING, description: 'Nova prioridade: low, medium, high, critical' },
            project_id: { type: SchemaType.STRING, description: 'UUID do novo projeto (null para remover)' },
            parent_id: { type: SchemaType.STRING, description: 'UUID do novo pai (null para remover)' },
            due_date: { type: SchemaType.STRING, description: 'Nova data de prazo (YYYY-MM-DD, null para remover)' }
          },
          required: ['task_id']
        }
      },
      {
        name: 'delete_work_task',
        description: 'Remove permanentemente um item de trabalho do G-Work pelo seu UUID.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            task_id: { type: SchemaType.STRING, description: 'UUID do item a ser deletado' }
          },
          required: ['task_id']
        }
      },
      // ---- PROJECTS ----
      {
        name: 'list_work_projects',
        description: 'Lista todos os projetos cadastrados no G-Work do usuário.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'create_work_project',
        description: 'Cria um novo projeto no G-Work.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: 'Nome do projeto' },
            description: { type: SchemaType.STRING, description: 'Descrição opcional do projeto' },
            color: { type: SchemaType.STRING, description: 'Cor hexadecimal ou nome do tema (opcional)' }
          },
          required: ['name']
        }
      },
      {
        name: 'update_work_project',
        description: 'Atualiza os campos de um projeto existente no G-Work.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            project_id: { type: SchemaType.STRING, description: 'UUID do projeto a ser atualizado' },
            name: { type: SchemaType.STRING, description: 'Novo nome' },
            description: { type: SchemaType.STRING, description: 'Nova descrição' },
            color: { type: SchemaType.STRING, description: 'Nova cor' }
          },
          required: ['project_id']
        }
      },
      {
        name: 'delete_work_project',
        description: 'Remove um projeto do G-Work pelo seu UUID.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            project_id: { type: SchemaType.STRING, description: 'UUID do projeto a ser deletado' }
          },
          required: ['project_id']
        }
      },
      // ---- TRANSCRIPTIONS ----
      {
        name: 'list_transcriptions',
        description: 'Lista as transcrições de voz/vídeo do usuário no G-Work. Retorna IDs, nomes de arquivo, token count e data de criação.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            limit: { type: SchemaType.NUMBER, description: 'Número máximo de transcrições a retornar (padrão 20)' }
          }
        }
      },
      {
        name: 'delete_transcription',
        description: 'Remove uma transcrição do G-Work pelo seu UUID.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            transcription_id: { type: SchemaType.STRING, description: 'UUID da transcrição a ser removida' }
          },
          required: ['transcription_id']
        }
      },
      // ---- AI INSIGHTS ----
      {
        name: 'list_ai_insights',
        description: 'Lista os insights de IA gerados a partir de transcrições no G-Work.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            limit: { type: SchemaType.NUMBER, description: 'Número máximo de insights a retornar (padrão 20)' }
          }
        }
      },
      {
        name: 'dismiss_ai_insight',
        description: 'Descarta/remove um insight de IA do G-Work pelo seu UUID.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            insight_id: { type: SchemaType.STRING, description: 'UUID do insight a ser descartado' }
          },
          required: ['insight_id']
        }
      }
    ]
  }
];

// ---------------------------------------------------------------------------
// CPO Assistant — Resposta Conversacional para o G-Work
// ---------------------------------------------------------------------------
export async function generateWorkResponse(
  query: string,
  chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
  supabaseClient: any,
  aiMemoryWork?: string
): Promise<string> {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });

  const systemPrompt = `
    Você é o "CPO Assistant" — o parceiro de execução e estratégia de produto por trás do G-Work (plataforma de gestão de vida, tarefas e projetos do Guilherme, CTO & Fundador).
    Sua persona é tática, direta e orientada a resultados. Você funciona como um Chief Product Officer virtual: entende o contexto, prioriza o que importa e ajuda a executar sem fricção.
    
    Guilherme valoriza precisão, clareza e ação. Evite introduções genéricas ("claro!", "vamos lá!", "com prazer!"). Vá direto ao ponto.
    
    ---
    DATA E HORA DO SISTEMA (Temporal awareness):
    Momento atual: ${formattedDate}.
    Use este contexto para interpretar "hoje", "essa semana", "prazo", etc.
    ---
    
    ---
    MEMÓRIA PERSISTENTE DO G-WORK (Contexto e aprendizados anteriores):
    ${aiMemoryWork || 'Nenhuma memória de longo prazo do G-Work consolidada ainda.'}
    ---
    
    ESCOPO DO SEU ACESSO:
    Você tem acesso EXCLUSIVO às tabelas do G-Work:
    - tasks (tarefas, stories, épicos, features)
    - tasks_projects (projetos)
    - transcriptions (transcrições de voz/vídeo)
    - ai_insights (insights gerados por IA)
    
    Você NÃO tem acesso e NÃO deve mencionar dados financeiros (balances, transactions, goals, reminders, credit_cards).
    
    FERRAMENTAS DISPONÍVEIS:
    Você possui ferramentas para GERENCIAR completamente o G-Work:
    - Listar, criar, atualizar e deletar tarefas
    - Listar, criar, atualizar e deletar projetos
    - Listar e deletar transcrições
    - Listar e descartar insights de IA
    
    Use as ferramentas de forma proativa sempre que o usuário solicitar qualquer operação sobre tarefas, projetos ou transcrições.
    
    DIRETRIZES DE RESPOSTA E ESTRUTURA:
    1. Baseie-se nos resultados das ferramentas para dar respostas precisas.
    2. Use markdown leve (negritos, listas) para estruturar as respostas.
    3. Fale estritamente em português brasileiro (pt-BR).
    4. Ao criar, atualizar ou deletar múltiplos itens, você DEVE gerar todas as chamadas de ferramentas de uma vez só em um único turno de chamada paralela (parallel function calling). Evite gerar chamadas em turnos sequenciais separados (ex: não crie um item em um turno para depois usar o ID dele em outro turno, a menos que seja estritamente inevitável). Execute todas as operações simultaneamente para evitar múltiplos roundtrips.
    5. **Arquitetura de Visualização do Kanban vs. Roadmap (Linear-style)**:
       - O **Quadro Kanban** (\`/tasks/kanban\`) exibe **apenas itens do tipo \`task\`** de forma plana (flat).
       - Os tipos estratégicos e organizacionais (**\`epic\`**, **\`feature\`** e **\`story\`**) pertencem estritamente à visão de **Roadmap** (\`/tasks/hierarchy\`).
       - Quando sugerir criação de tarefas ou responder ao usuário sobre a organização visual das tarefas, reforce que a estrutura hierárquica completa é navegável no Roadmap, enquanto o Kanban serve para focar na execução imediata de tasks atômicas com badges relacionando-as ao seu respectivo parent (Story ou Feature) e projeto.
       - A ação de Drag & Drop no Kanban foi corrigida para ser executada apenas usando o Grip handle vertical no card da task, e mapeia o drop no topo de outros cards resolvendo seu status automaticamente para evitar falhas de restrição.
    6. **Concisão e Resumos Sintéticos**: Ao analisar, listar ou propor agrupamentos de grandes volumes de tarefas (ex: sugerir unificação de 33 tarefas), seja extremamente conciso e focado em tópicos sintéticos de 1 linha. Nunca gere respostas prolixas repetindo descrições longas de cada tarefa individual, para evitar cortes abruptos no texto de saída por limite de tokens.

  `;

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: CONVERSATIONAL_MODEL,
    systemInstruction: { text: systemPrompt },
    tools: workTools as any,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    }
  });

  const formattedHistory = chatHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.parts[0].text }],
  }));

  const chat = model.startChat({ history: formattedHistory });
  let result = await sendMessageWithRetry(chat, query);
  let functionCalls = result.response.functionCalls();

  let loopCount = 0;
  const MAX_LOOPS = 5;

  while (functionCalls && functionCalls.length > 0 && loopCount < MAX_LOOPS) {
    loopCount++;
    console.info(`[CPO Assistant Tool] Executando ${functionCalls.length} chamada(s) de ferramenta em paralelo.`);

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');
    const userId = user.id;

    const promises = functionCalls.map(async (call: any) => {
      const { name, args } = call;
      console.info(`[CPO Assistant Tool] "${name}" com args:`, args);

      let toolResult: any;

      try {
        if (name === 'list_work_tasks') {
          const { status, priority, type, project_id, search, limit } = args as any;
          let q = supabaseClient.from('tasks').select('id, title, description, type, status, priority, project_id, parent_id, due_date, created_at').eq('user_id', userId);
          if (status) q = q.eq('status', status);
          if (priority) q = q.eq('priority', priority);
          if (type) q = q.eq('type', type);
          if (project_id) q = q.eq('project_id', project_id);
          if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
          const { data, error } = await q.order('created_at', { ascending: false }).limit(limit || 50);
          if (error) throw error;
          toolResult = { success: true, tasks: data || [], count: data?.length || 0 };

        } else if (name === 'create_work_task') {
          const { title, description, type, status, priority, project_id, parent_id, due_date } = args as any;
          const { data, error } = await supabaseClient.from('tasks').insert({
            user_id: userId,
            title,
            description: description || null,
            type: type || 'task',
            status: status || 'todo',
            priority: priority || 'medium',
            project_id: project_id || null,
            parent_id: parent_id || null,
            due_date: due_date ? new Date(due_date).toISOString() : null
          }).select('*');
          if (error) throw error;
          toolResult = { success: true, created: data?.[0] };

        } else if (name === 'update_work_task') {
          const { task_id, title, description, type, status, priority, project_id, parent_id, due_date } = args as any;
          const updates: any = {};
          if (title !== undefined) updates.title = title;
          if (description !== undefined) updates.description = description || null;
          if (type !== undefined) updates.type = type;
          if (status !== undefined) updates.status = status;
          if (priority !== undefined) updates.priority = priority;
          if (project_id !== undefined) updates.project_id = project_id || null;
          if (parent_id !== undefined) updates.parent_id = parent_id || null;
          if (due_date !== undefined) updates.due_date = due_date ? new Date(due_date).toISOString() : null;
          const { data, error } = await supabaseClient.from('tasks').update(updates).eq('id', task_id).eq('user_id', userId).select('*');
          if (error) throw error;
          toolResult = { success: true, updated: data?.[0] };

        } else if (name === 'delete_work_task') {
          const { task_id } = args as any;
          const { error } = await supabaseClient.from('tasks').delete().eq('id', task_id).eq('user_id', userId);
          if (error) throw error;
          toolResult = { success: true };

        } else if (name === 'list_work_projects') {
          const { data, error } = await supabaseClient.from('tasks_projects').select('*').eq('user_id', userId).order('name', { ascending: true });
          if (error) throw error;
          toolResult = { success: true, projects: data || [] };

        } else if (name === 'create_work_project') {
          const { name: projName, description, color } = args as any;
          const { data, error } = await supabaseClient.from('tasks_projects').insert({
            user_id: userId,
            name: projName,
            description: description || null,
            color: color || null
          }).select('*');
          if (error) throw error;
          toolResult = { success: true, created: data?.[0] };

        } else if (name === 'update_work_project') {
          const { project_id, name: projName, description, color } = args as any;
          const updates: any = {};
          if (projName !== undefined) updates.name = projName;
          if (description !== undefined) updates.description = description;
          if (color !== undefined) updates.color = color;
          const { data, error } = await supabaseClient.from('tasks_projects').update(updates).eq('id', project_id).eq('user_id', userId).select('*');
          if (error) throw error;
          toolResult = { success: true, updated: data?.[0] };

        } else if (name === 'delete_work_project') {
          const { project_id } = args as any;
          const { error } = await supabaseClient.from('tasks_projects').delete().eq('id', project_id).eq('user_id', userId);
          if (error) throw error;
          toolResult = { success: true };

        } else if (name === 'list_transcriptions') {
          const { limit } = args as any;
          const { data, error } = await supabaseClient.from('transcriptions').select('id, file_name, created_at, token_count').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit || 20);
          if (error) throw error;
          toolResult = { success: true, transcriptions: data || [] };

        } else if (name === 'delete_transcription') {
          const { transcription_id } = args as any;
          const { error } = await supabaseClient.from('transcriptions').delete().eq('id', transcription_id).eq('user_id', userId);
          if (error) throw error;
          toolResult = { success: true };

        } else if (name === 'list_ai_insights') {
          const { limit } = args as any;
          const { data, error } = await supabaseClient.from('ai_insights').select('id, title, summary, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit || 20);
          if (error) throw error;
          toolResult = { success: true, insights: data || [] };

        } else if (name === 'dismiss_ai_insight') {
          const { insight_id } = args as any;
          const { error } = await supabaseClient.from('ai_insights').delete().eq('id', insight_id).eq('user_id', userId);
          if (error) throw error;
          toolResult = { success: true };

        } else {
          throw new Error(`Ferramenta desconhecida: ${name}`);
        }
      } catch (err: any) {
        console.error(`[CPO Assistant Tool] Erro em "${name}":`, err);
        toolResult = { success: false, error: err.message || 'Erro técnico na ferramenta.' };
      }

      return {
        functionResponse: { name, response: toolResult }
      };
    });

    const functionResponses = await Promise.all(promises);
    result = await sendMessageWithRetry(chat, functionResponses as any);
    functionCalls = result.response.functionCalls();
  }

  return result.response.text();
}
