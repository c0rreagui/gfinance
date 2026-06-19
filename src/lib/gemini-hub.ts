/**
 * src/lib/gemini-hub.ts
 *
 * Módulo CoS Assistant (Chief of Staff) — Gemini AI Brain do G-Hub Command Center.
 * Fornece ao assistente:
 * 1. Prompt de sistema integrado (Finanças + Trabalho + Calendário Pessoal).
 * 2. Function Calling com controle sobre eventos de calendário, tarefas do G-Work e leitura de finanças.
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
        console.warn(`[Gemini Retry] Rate limit (429) detectado. Tentativa ${attempt} de 3 em ${delay}ms...`, err);
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
// Tools do G-Hub CoS Assistant
// ---------------------------------------------------------------------------
const hubTools = [
  {
    functionDeclarations: [
      // ---- CALENDAR EVENTS ----
      {
        name: 'list_calendar_events',
        description: 'Lista os compromissos e eventos da agenda/calendário pessoal do usuário.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            start_date: { type: SchemaType.STRING, description: 'Filtrar a partir desta data (Formato ISO: YYYY-MM-DD)' },
            end_date: { type: SchemaType.STRING, description: 'Filtrar até esta data (Formato ISO: YYYY-MM-DD)' },
            search: { type: SchemaType.STRING, description: 'Termo de busca no título ou descrição' }
          }
        }
      },
      {
        name: 'create_calendar_event',
        description: 'Adiciona um novo compromisso na agenda do usuário.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, description: 'Título do compromisso (obrigatório)' },
            description: { type: SchemaType.STRING, description: 'Descrição detalhada do compromisso' },
            start_time: { type: SchemaType.STRING, description: 'Data/Hora de início (Formato ISO)' },
            end_time: { type: SchemaType.STRING, description: 'Data/Hora de fim (Formato ISO)' },
            location: { type: SchemaType.STRING, description: 'Localização ou link de reunião' },
            is_all_day: { type: SchemaType.BOOLEAN, description: 'Indica se é um evento de dia inteiro' },
            color: { type: SchemaType.STRING, description: 'Cor em formato hexadecimal (ex: #6366f1) ou nome básico' },
            category: { type: SchemaType.STRING, description: 'Categoria: work, personal, finance, general (padrão: general)' }
          },
          required: ['title', 'start_time', 'end_time']
        }
      },
      {
        name: 'update_calendar_event',
        description: 'Atualiza um compromisso existente na agenda.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            event_id: { type: SchemaType.STRING, description: 'UUID do evento de calendário a atualizar' },
            title: { type: SchemaType.STRING, description: 'Novo título' },
            description: { type: SchemaType.STRING, description: 'Nova descrição' },
            start_time: { type: SchemaType.STRING, description: 'Nova data/hora de início' },
            end_time: { type: SchemaType.STRING, description: 'Nova data/hora de término' },
            location: { type: SchemaType.STRING, description: 'Novo local' },
            is_all_day: { type: SchemaType.BOOLEAN, description: 'Alterar se é dia inteiro' },
            color: { type: SchemaType.STRING, description: 'Nova cor hexadecimal' },
            category: { type: SchemaType.STRING, description: 'Nova categoria' }
          },
          required: ['event_id']
        }
      },
      {
        name: 'delete_calendar_event',
        description: 'Exclui um compromisso da agenda do usuário pelo UUID.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            event_id: { type: SchemaType.STRING, description: 'UUID do compromisso a ser deletado' }
          },
          required: ['event_id']
        }
      },

      // ---- WORK TASKS (G-Work Integration) ----
      {
        name: 'list_work_tasks',
        description: 'Lista as tarefas e itens de trabalho no G-Work. Permite filtrar por status, prioridade ou projeto.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            status: { type: SchemaType.STRING, description: 'Status: backlog, todo, in_progress, in_review, done' },
            priority: { type: SchemaType.STRING, description: 'Prioridade: low, medium, high, critical' },
            search: { type: SchemaType.STRING, description: 'Buscar texto no título ou descrição' }
          }
        }
      },
      {
        name: 'create_work_task',
        description: 'Cria uma nova tarefa no G-Work para o usuário.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, description: 'Título da tarefa (obrigatório)' },
            description: { type: SchemaType.STRING, description: 'Descrição opcional' },
            status: { type: SchemaType.STRING, description: 'Status inicial (default: todo)' },
            priority: { type: SchemaType.STRING, description: 'Prioridade: low, medium, high, critical (default: medium)' },
            project_id: { type: SchemaType.STRING, description: 'UUID do projeto opcional' },
            due_date: { type: SchemaType.STRING, description: 'Prazo da tarefa (ISO YYYY-MM-DD)' }
          },
          required: ['title']
        }
      },
      {
        name: 'update_work_task',
        description: 'Atualiza campos de uma tarefa existente no G-Work.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            task_id: { type: SchemaType.STRING, description: 'UUID da tarefa a atualizar' },
            title: { type: SchemaType.STRING, description: 'Novo título' },
            description: { type: SchemaType.STRING, description: 'Nova descrição' },
            status: { type: SchemaType.STRING, description: 'Novo status' },
            priority: { type: SchemaType.STRING, description: 'Nova prioridade' },
            project_id: { type: SchemaType.STRING, description: 'Novo projeto UUID' },
            due_date: { type: SchemaType.STRING, description: 'Nova data de prazo (ISO YYYY-MM-DD)' }
          },
          required: ['task_id']
        }
      },
      {
        name: 'delete_work_task',
        description: 'Remove uma tarefa do G-Work.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            task_id: { type: SchemaType.STRING, description: 'UUID da tarefa a remover' }
          },
          required: ['task_id']
        }
      },
      {
        name: 'list_work_projects',
        description: 'Lista todos os projetos cadastrados no G-Work.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}
        }
      },

      // ---- FINANCE DATA (G-Finance Integration - Read Only for Safety) ----
      {
        name: 'list_financial_balances',
        description: 'Lista os saldos consolidados do usuário (Saldo Total, Receitas e Despesas do mês).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'list_credit_cards',
        description: 'Lista os cartões de crédito configurados e limites/faturas do usuário.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'list_financial_reminders',
        description: 'Lista as próximas contas, cobranças e boletos pendentes/recorrentes.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}
        }
      }
    ]
  }
];

// ---------------------------------------------------------------------------
// CoS Assistant — Resposta Conversacional do G-Hub
// ---------------------------------------------------------------------------
export async function generateHubResponse(
  query: string,
  chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
  supabaseClient: any,
  aiMemoryHub?: string
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
    Você é o "CoS Assistant" (Chief of Staff) — o braço direito estratégico de Guilherme Corrêa (CTO & Fundador) no ecossistema G-Hub.
    Sua missão é atuar com visão holística sobre as finanças do Guilherme (módulo G-Finance) e a produtividade/tarefas dele (módulo G-Work), além de gerenciar a sua agenda pessoal e compromissos.

    Persona: Altamente qualificado, polido, focado em alta performance. Seu tom é executivo, direto e extremamente conciso. Evite qualquer tipo de rodeio, introduções desnecessárias ou palavras de preenchimento.

    ---
    DATA E HORA DO SISTEMA (Temporal awareness):
    Momento atual: ${formattedDate}.
    Use isso para decifrar termos de tempo ("hoje", "amanhã", "próxima quarta", etc.).
    ---

    ---
    MEMÓRIA PERSISTENTE DO CHIEF OF STAFF (CoS Brain):
    ${aiMemoryHub || 'Nenhuma memória de longo prazo do CoS consolidada ainda.'}
    ---

    ESCOPO E FERRAMENTAS:
    1. AGENDA/CALENDÁRIO: Você tem controle total. Pode listar, criar, alterar e deletar compromissos com o usuário na tabela 'calendar_events'.
    2. G-WORK TAREFAS: Você pode listar, criar, alterar e deletar tarefas no G-Work (tabela 'tasks'). É o centro de produtividade.
    3. G-FINANCE LEITURA: Você pode ler saldos, faturas e contas pendentes para manter o Guilherme informado, mas NÃO realiza mutações financeiras (para segurança).

    Sempre que o usuário pedir para agendar compromissos, lembrá-lo de algo ou criar/verificar tarefas, invoque as ferramentas apropriadas proativamente.
    Para otimizar performance e tempo de resposta na Vercel, você deve enviar TODAS as chamadas de ferramentas de uma só vez (parallel function calling) no mesmo turno se envolver múltiplos passos.

    DIRETRIZES DE RESPOSTA:
    - Fale em português do Brasil (pt-BR).
    - Escreva de forma executiva, em tópicos estruturados quando útil.
    - Se encontrar conflitos de agenda ou tarefas de alta prioridade nas finanças ou trabalho, avise de forma proativa ("Alerta: você possui 3 boletos vencendo amanhã e a tarefa X atrasada").
  `;

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: CONVERSATIONAL_MODEL,
    systemInstruction: { text: systemPrompt },
    tools: hubTools as any,
    generationConfig: {
      temperature: 0.3,
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
    console.info(`[CoS Assistant Tool] Executando ${functionCalls.length} chamadas de ferramenta.`);

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado no Supabase.');
    const userId = user.id;

    const promises = functionCalls.map(async (call: any) => {
      const { name, args } = call;
      console.info(`[CoS Assistant Tool] Invocando "${name}" com args:`, args);
      let toolResult: any = null;

      try {
        if (name === 'list_calendar_events') {
          const { start_date, end_date, search } = args as any;
          let queryBuilder = supabaseClient.from('calendar_events').select('*').eq('user_id', userId);
          
          if (start_date) queryBuilder = queryBuilder.gte('start_time', start_date);
          if (end_date) queryBuilder = queryBuilder.lte('end_time', end_date);
          if (search) queryBuilder = queryBuilder.ilike('title', `%${search}%`);

          const { data, error } = await queryBuilder.order('start_time', { ascending: true });
          if (error) throw error;
          toolResult = { success: true, events: data || [] };

        } else if (name === 'create_calendar_event') {
          const { title, description, start_time, end_time, location, is_all_day, color, category } = args as any;
          const { data, error } = await supabaseClient.from('calendar_events').insert({
            user_id: userId,
            title,
            description: description || null,
            start_time: new Date(start_time).toISOString(),
            end_time: new Date(end_time).toISOString(),
            location: location || null,
            is_all_day: is_all_day || false,
            color: color || '#6366f1',
            category: category || 'general'
          }).select('*');

          if (error) throw error;
          toolResult = { success: true, created: data?.[0] };

        } else if (name === 'update_calendar_event') {
          const { event_id, title, description, start_time, end_time, location, is_all_day, color, category } = args as any;
          const updates: any = {};
          if (title !== undefined) updates.title = title;
          if (description !== undefined) updates.description = description;
          if (start_time !== undefined) updates.start_time = new Date(start_time).toISOString();
          if (end_time !== undefined) updates.end_time = new Date(end_time).toISOString();
          if (location !== undefined) updates.location = location;
          if (is_all_day !== undefined) updates.is_all_day = is_all_day;
          if (color !== undefined) updates.color = color;
          if (category !== undefined) updates.category = category;

          const { data, error } = await supabaseClient
            .from('calendar_events')
            .update(updates)
            .eq('id', event_id)
            .eq('user_id', userId)
            .select('*');

          if (error) throw error;
          toolResult = { success: true, updated: data?.[0] };

        } else if (name === 'delete_calendar_event') {
          const { event_id } = args as any;
          const { error } = await supabaseClient
            .from('calendar_events')
            .delete()
            .eq('id', event_id)
            .eq('user_id', userId);

          if (error) throw error;
          toolResult = { success: true };

        } else if (name === 'list_work_tasks') {
          const { status, priority, search } = args as any;
          let queryBuilder = supabaseClient.from('tasks').select('*').eq('user_id', userId);

          if (status) queryBuilder = queryBuilder.eq('status', status);
          if (priority) queryBuilder = queryBuilder.eq('priority', priority);
          if (search) queryBuilder = queryBuilder.ilike('title', `%${search}%`);

          const { data, error } = await queryBuilder.order('sort_order', { ascending: true });
          if (error) throw error;
          toolResult = { success: true, tasks: data || [] };

        } else if (name === 'create_work_task') {
          const { title, description, status, priority, project_id, due_date } = args as any;
          const { data, error } = await supabaseClient.from('tasks').insert({
            user_id: userId,
            title,
            description: description || null,
            status: status || 'todo',
            priority: priority || 'medium',
            project_id: project_id || null,
            due_date: due_date ? new Date(due_date).toISOString() : null,
            type: 'task'
          }).select('*');

          if (error) throw error;
          toolResult = { success: true, created: data?.[0] };

        } else if (name === 'update_work_task') {
          const { task_id, title, description, status, priority, project_id, due_date } = args as any;
          const updates: any = {};
          if (title !== undefined) updates.title = title;
          if (description !== undefined) updates.description = description;
          if (status !== undefined) updates.status = status;
          if (priority !== undefined) updates.priority = priority;
          if (project_id !== undefined) updates.project_id = project_id || null;
          if (due_date !== undefined) updates.due_date = due_date ? new Date(due_date).toISOString() : null;

          const { data, error } = await supabaseClient
            .from('tasks')
            .update(updates)
            .eq('id', task_id)
            .eq('user_id', userId)
            .select('*');

          if (error) throw error;
          toolResult = { success: true, updated: data?.[0] };

        } else if (name === 'delete_work_task') {
          const { task_id } = args as any;
          const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', task_id)
            .eq('user_id', userId);

          if (error) throw error;
          toolResult = { success: true };

        } else if (name === 'list_work_projects') {
          const { data, error } = await supabaseClient
            .from('tasks_projects')
            .select('*')
            .eq('user_id', userId)
            .order('name', { ascending: true });

          if (error) throw error;
          toolResult = { success: true, projects: data || [] };

        } else if (name === 'list_financial_balances') {
          const { data, error } = await supabaseClient
            .from('balances')
            .select('*')
            .eq('user_id', userId);

          if (error) throw error;
          toolResult = { success: true, balances: data || [] };

        } else if (name === 'list_credit_cards') {
          const { data, error } = await supabaseClient
            .from('credit_cards')
            .select('*')
            .eq('user_id', userId);

          if (error) throw error;
          toolResult = { success: true, creditCards: data || [] };

        } else if (name === 'list_financial_reminders') {
          const { data, error } = await supabaseClient
            .from('reminders')
            .select('*')
            .eq('user_id', userId)
            .eq('paid', false)
            .order('due_date', { ascending: true });

          if (error) throw error;
          toolResult = { success: true, reminders: data || [] };

        } else {
          throw new Error(`Ferramenta desconhecida no hub: ${name}`);
        }
      } catch (err: any) {
        console.error(`[CoS Assistant Tool] Erro em ${name}:`, err);
        toolResult = { success: false, error: err.message || 'Erro de execução da ferramenta.' };
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
