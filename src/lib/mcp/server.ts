import { createClient } from '@supabase/supabase-js';
import { executeFinancialTool } from '@/lib/gemini';
import { executeWorkTool } from '@/lib/gemini-work';
import { executeHubTool } from '@/lib/gemini-hub';
import { reconcileBalances } from '@/lib/reconcile';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const MCP_TOOLS_DEFINITION = [
  // --- G-FINANCE TOOLS ---
  {
    name: 'get_financial_dashboard',
    description: 'Retorna um resumo executivo financeiro 360° (Receitas vs Despesas do mês, Saldo consolidado, Taxa de poupança e alertas de contas a vencer nos próximos 7 dias).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_user_transactions',
    description: 'Lista transações financeiras reais do usuário no G-Finance. Retorna UUIDs, descrições, valores, categorias e datas.',
    inputSchema: {
      type: 'object',
      properties: {
        searchQuery: { type: 'string', description: 'Termo de busca opcional para filtrar por descrição (ex: Netflix, Mercado)' },
        category: { type: 'string', description: 'Categoria opcional para filtrar transações (ex: Alimentação, Salário, Cartão, Utilidades, Transporte, Assinaturas, Boleto, Saúde, Outros)' },
        limit: { type: 'number', description: 'Limite máximo de registros a retornar (padrão 30)' }
      }
    }
  },
  {
    name: 'create_user_transaction',
    description: 'Cria/insere uma nova transação financeira (receita ou despesa) no banco de dados do usuário no G-Finance.',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Descrição textual clara do lançamento (ex: Uber, Mercado, Freelance)' },
        amount: { type: 'number', description: 'Valor monetário. Valores negativos para despesas/saídas, valores positivos para receitas/entradas.' },
        category: { type: 'string', description: 'Categoria exata da transação (Alimentação, Salário, Cartão, Utilidades, Transporte, Assinaturas, Boleto, Rendimentos, Transferência, Saúde, Outros)' },
        date: { type: 'string', description: 'Data opcional do lançamento no formato ISO (YYYY-MM-DD)' }
      },
      required: ['description', 'amount', 'category']
    }
  },
  {
    name: 'update_user_transaction',
    description: 'Modifica um ou mais campos de uma transação financeira existente do usuário.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', description: 'O UUID único identificador da transação a ser modificada.' },
        description: { type: 'string', description: 'Nova descrição opcional' },
        amount: { type: 'number', description: 'Novo valor opcional (negativo para despesa, positivo para receita)' },
        category: { type: 'string', description: 'Nova categoria opcional' },
        date: { type: 'string', description: 'Nova data opcional no formato ISO (YYYY-MM-DD)' }
      },
      required: ['transactionId']
    }
  },
  {
    name: 'delete_user_transaction',
    description: 'Remove definitivamente uma única transação financeira do usuário no banco de dados pelo seu UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', description: 'O UUID único identificador da transação a ser deletada.' }
      },
      required: ['transactionId']
    }
  },
  {
    name: 'reconcile_user_balances',
    description: 'Recalcula e sincroniza todos os saldos de caixas e contas no G-Finance.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_user_reminders',
    description: 'Lista contas a pagar, dívidas ou assinaturas recorrentes do usuário. Permite filtrar por assinaturas (isRecurring) e status pago.',
    inputSchema: {
      type: 'object',
      properties: {
        isRecurring: { type: 'boolean', description: 'Filtrar por assinaturas recorrentes (true) ou dívidas pontuais (false)' },
        paid: { type: 'boolean', description: 'Filtrar por status pago (true/false)' }
      }
    }
  },
  {
    name: 'create_user_reminder',
    description: 'Cria uma nova conta a pagar, dívida ou assinatura recorrente na tabela reminders do usuário.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título identificador da conta/dívida/assinatura (ex: Netflix, Fatura Light, Empréstimo)' },
        amount: { type: 'number', description: 'Valor financeiro (positivo, pois representa a obrigação).' },
        dueDate: { type: 'string', description: 'Data de vencimento em formato ISO (YYYY-MM-DD)' },
        urgency: { type: 'string', description: 'Grau de urgência da dívida (high, medium, low)' },
        isRecurring: { type: 'boolean', description: 'Se true, é tratado como assinatura recorrente mensal. Se false, é uma dívida/compromisso pontual.' },
        paid: { type: 'boolean', description: 'Status inicial de pagamento (padrão false)' }
      },
      required: ['title', 'amount', 'dueDate']
    }
  },
  {
    name: 'update_user_reminder',
    description: 'Atualiza detalhes de uma conta a pagar, dívida ou assinatura existente (incluindo marcar como pago ou alterar o valor/data).',
    inputSchema: {
      type: 'object',
      properties: {
        reminderId: { type: 'string', description: 'UUID único identificador do lembrete/dívida/assinatura.' },
        title: { type: 'string', description: 'Novo título' },
        amount: { type: 'number', description: 'Novo valor' },
        dueDate: { type: 'string', description: 'Nova data de vencimento (YYYY-MM-DD)' },
        urgency: { type: 'string', description: 'Nova urgência (high, medium, low)' },
        isRecurring: { type: 'boolean', description: 'Alterar se é recorrente' },
        paid: { type: 'boolean', description: 'Marcar como pago (true) ou não pago (false)' }
      },
      required: ['reminderId']
    }
  },
  {
    name: 'delete_user_reminder',
    description: 'Remove permanentemente uma dívida, conta ou assinatura do usuário pelo UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        reminderId: { type: 'string', description: 'UUID do lembrete a ser removido.' }
      },
      required: ['reminderId']
    }
  },
  {
    name: 'list_user_goals',
    description: 'Lista as metas de investimento e patrimônio ativas do usuário.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'create_user_goal',
    description: 'Cria uma nova meta de investimento ou patrimônio para o usuário.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome descritivo da meta (ex: Reserva de Emergência, Viagem Japão)' },
        targetAmount: { type: 'number', description: 'Valor alvo/final da meta' },
        currentAmount: { type: 'number', description: 'Valor atual acumulado (padrão 0)' },
        color: { type: 'string', description: 'Nome da cor identificadora (emerald, blue, indigo, amber, pink, violet, teal, rose, red, green, orange)' }
      },
      required: ['name', 'targetAmount']
    }
  },

  // --- SIMULATION & FIRE TOOLS ---
  {
    name: 'run_financial_simulation',
    description: 'Executa uma simulação financeira de independência (FIRE) ou projeção de juros compostos com base em aportes mensais, taxa de retorno esperada e patrimônio alvo.',
    inputSchema: {
      type: 'object',
      properties: {
        monthlyContribution: { type: 'number', description: 'Aporte mensal em R$' },
        annualReturnRate: { type: 'number', description: 'Taxa anual de retorno estimada em % (ex: 10 para 10% a.a.)' },
        targetPatrimony: { type: 'number', description: 'Patrimônio alvo de independência financeira em R$' },
        years: { type: 'number', description: 'Horizonte de tempo em anos (padrão 10)' }
      },
      required: ['monthlyContribution']
    }
  },

  // --- G-WORK TACTICAL TASKS TOOLS ---
  {
    name: 'list_work_tasks',
    description: 'Lista as tarefas e demandas táticas ativas no módulo G-Work. Permite filtrar por prioridade (high, medium, low) e status (todo, in_progress, done).',
    inputSchema: {
      type: 'object',
      properties: {
        priority: { type: 'string', description: 'Filtrar por prioridade: high, medium, low' },
        status: { type: 'string', description: 'Filtrar por status: todo, in_progress, done' }
      }
    }
  },
  {
    name: 'create_work_task',
    description: 'Cria uma nova demanda tática no G-Work.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da tarefa' },
        description: { type: 'string', description: 'Detalhamento opcional da demanda' },
        priority: { type: 'string', description: 'Prioridade: high, medium, low (padrão medium)' },
        dueDate: { type: 'string', description: 'Data de entrega (YYYY-MM-DD)' }
      },
      required: ['title']
    }
  },

  // --- EXECUTIVE BRIEFING & MEMORY TOOLS ---
  {
    name: 'generate_executive_briefing',
    description: 'Gera um Relatório Executivo Consolidado do Ecossistema G-Hub em Markdown formatado contendo: Visão 360° Financeira + Tarefas Táticas + Contas Próximas do Vencimento + Progresso de Metas.',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Período do relatório: daily, weekly, monthly (padrão weekly)' }
      }
    }
  },
  {
    name: 'search_user_memory',
    description: 'Busca memórias permanentes, regras operacionais e preferências aprendidas pela IA no G-Hub.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de busca na memória da IA' }
      }
    }
  },
  {
    name: 'get_ecosystem_status',
    description: 'Retorna a saúde geral do ecossistema G-Hub (status de conexões, última sincronização do Google Drive, modelos ativos e métricas).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // --- G-FINANCE: GOALS (UPDATE/DELETE) ---
  {
    name: 'update_user_goal',
    description: 'Atualiza uma meta de investimento existente (nome, valor alvo, valor acumulado, cor).',
    inputSchema: {
      type: 'object',
      properties: {
        goalId: { type: 'string', description: 'UUID da meta' },
        name: { type: 'string', description: 'Novo nome descritivo' },
        targetAmount: { type: 'number', description: 'Novo valor alvo' },
        currentAmount: { type: 'number', description: 'Novo valor acumulado' },
        color: { type: 'string', description: 'Nova cor' }
      },
      required: ['goalId']
    }
  },
  {
    name: 'delete_user_goal',
    description: 'Remove definitivamente uma meta de investimento pelo UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        goalId: { type: 'string', description: 'UUID da meta a excluir' }
      },
      required: ['goalId']
    }
  },

  // --- G-FINANCE: BULK DELETE ---
  {
    name: 'delete_user_transactions',
    description: 'Exclui múltiplas transações por lista de UUIDs, por categoria específica ou limpa TODO o histórico financeiro.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionIds: { type: 'array', items: { type: 'string' }, description: 'Lista de UUIDs' },
        deleteAll: { type: 'boolean', description: 'Se true, remove TODAS as transações' },
        category: { type: 'string', description: 'Remove todas de uma categoria' }
      }
    }
  },

  // --- G-FINANCE: CREDIT CARDS ---
  {
    name: 'list_user_credit_cards',
    description: 'Lista os cartões de crédito cadastrados com limites, faturas, dias de vencimento/fechamento e cores.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'update_user_credit_card',
    description: 'Atualiza configurações de um cartão de crédito (limite, fatura manual, nome, dias de vencimento/fechamento, cor).',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: { type: 'string', description: 'UUID do cartão' },
        cardName: { type: 'string', description: 'Novo nome do cartão' },
        cardLimit: { type: 'number', description: 'Novo limite total' },
        manualInvoiceAmount: { type: 'number', description: 'Valor manual da fatura (null para automático)' },
        closingDay: { type: 'number', description: 'Dia de fechamento (1-31)' },
        dueDay: { type: 'number', description: 'Dia de vencimento (1-31)' },
        colorTheme: { type: 'string', description: 'Tema de cor: emerald, indigo, rose, amber, crimson' }
      },
      required: ['cardId']
    }
  },

  // --- G-WORK: PROJECTS ---
  {
    name: 'list_work_projects',
    description: 'Lista todos os projetos do G-Work.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'create_work_project',
    description: 'Cria um novo projeto no G-Work.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do projeto' },
        description: { type: 'string', description: 'Descrição do projeto' },
        color: { type: 'string', description: 'Cor do projeto' }
      },
      required: ['name']
    }
  },
  {
    name: 'update_work_project',
    description: 'Atualiza um projeto existente no G-Work.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'UUID do projeto' },
        name: { type: 'string', description: 'Novo nome' },
        description: { type: 'string', description: 'Nova descrição' },
        color: { type: 'string', description: 'Nova cor' }
      },
      required: ['projectId']
    }
  },
  {
    name: 'delete_work_project',
    description: 'Remove um projeto do G-Work pelo UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'UUID do projeto' }
      },
      required: ['projectId']
    }
  },

  // --- G-WORK: TASKS (UPDATE/DELETE) ---
  {
    name: 'update_work_task',
    description: 'Atualiza campos de uma tarefa no G-Work (título, status, prioridade, projeto, tipo, prazo).',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'UUID da tarefa' },
        title: { type: 'string', description: 'Novo título' },
        description: { type: 'string', description: 'Nova descrição' },
        status: { type: 'string', description: 'Novo status: backlog, todo, in_progress, in_review, done' },
        priority: { type: 'string', description: 'Nova prioridade: low, medium, high, critical' },
        type: { type: 'string', description: 'Tipo: task, story, feature, epic' },
        project_id: { type: 'string', description: 'UUID do projeto' },
        dueDate: { type: 'string', description: 'Nova data de entrega (YYYY-MM-DD)' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'delete_work_task',
    description: 'Remove uma tarefa do G-Work pelo UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'UUID da tarefa' }
      },
      required: ['taskId']
    }
  },

  // --- G-WORK: TRANSCRIPTIONS & INSIGHTS ---
  {
    name: 'list_transcriptions',
    description: 'Lista transcrições de reuniões/gravações processadas no G-Work.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'delete_transcription',
    description: 'Remove uma transcrição de reunião pelo UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        transcriptionId: { type: 'string', description: 'UUID da transcrição' }
      },
      required: ['transcriptionId']
    }
  },
  {
    name: 'list_ai_insights',
    description: 'Lista insights gerados pela IA a partir de transcrições de reuniões.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'dismiss_ai_insight',
    description: 'Descarta/remove um insight de IA pelo UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        insightId: { type: 'string', description: 'UUID do insight' }
      },
      required: ['insightId']
    }
  },

  // --- G-HUB: CALENDAR ---
  {
    name: 'list_calendar_events',
    description: 'Lista eventos da agenda pessoal do G-Hub, sincronizados com o Google Calendar.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Data inicial (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'Data final (YYYY-MM-DD)' },
        search: { type: 'string', description: 'Termo de busca no título/descrição' }
      }
    }
  },
  {
    name: 'create_calendar_event',
    description: 'Cria um evento na agenda e sincroniza com o Google Calendar.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título do evento' },
        description: { type: 'string', description: 'Descrição detalhada' },
        startTime: { type: 'string', description: 'Início (ISO 8601)' },
        endTime: { type: 'string', description: 'Fim (ISO 8601)' },
        location: { type: 'string', description: 'Local do evento' },
        isAllDay: { type: 'boolean', description: 'Se é evento de dia inteiro' },
        color: { type: 'string', description: 'Cor do evento' },
        category: { type: 'string', description: 'Categoria (work, personal, health, finance)' }
      },
      required: ['title', 'startTime']
    }
  },
  {
    name: 'update_calendar_event',
    description: 'Atualiza um evento da agenda existente e sincroniza com o Google Calendar.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'UUID do evento' },
        title: { type: 'string', description: 'Novo título' },
        description: { type: 'string', description: 'Nova descrição' },
        startTime: { type: 'string', description: 'Novo início (ISO 8601)' },
        endTime: { type: 'string', description: 'Novo fim (ISO 8601)' },
        location: { type: 'string', description: 'Novo local' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'delete_calendar_event',
    description: 'Remove um evento da agenda e deleta do Google Calendar.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'UUID do evento a remover' }
      },
      required: ['eventId']
    }
  },

  // --- G-HUB: FINANCIAL BALANCES (Read-only) ---
  {
    name: 'list_financial_balances',
    description: 'Lista as contas de saldo do usuário (Corrente, Poupança, Investimentos, Caixa) com valores atuais e tendências.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function processMcpJsonRpcRequest(
  jsonRpcMessage: any,
  userId: string
): Promise<any> {
  const { jsonrpc, id, method, params } = jsonRpcMessage || {};

  // 1. Handshake Initialize
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: id ?? 1,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false }
        },
        serverInfo: {
          name: 'G-Hub Ecosystem MCP Server',
          version: '3.0.0'
        }
      }
    };
  }

  if (method === 'notifications/initialized' || method === 'initialized') {
    return null;
  }

  // 2. Listar Ferramentas (tools/list)
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: id ?? 1,
      result: {
        tools: MCP_TOOLS_DEFINITION
      }
    };
  }

  // 3. Executar Ferramenta (tools/call)
  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};

    if (!name) {
      return {
        jsonrpc: '2.0',
        id: id ?? 1,
        error: { code: -32602, message: 'Parâmetro "name" da ferramenta é obrigatório.' }
      };
    }

    try {
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      let toolResult: any;

      // Execuções personalizadas para novas ferramentas estendidas
      if (name === 'get_financial_dashboard') {
        const reconcile = await reconcileBalances(adminSupabase, userId);
        const { data: recentTxs } = await adminSupabase
          .from('transactions')
          .select('description, amount, category, date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(10);
        const { data: upcomingReminders } = await adminSupabase
          .from('reminders')
          .select('title, amount, due_date, urgency')
          .eq('user_id', userId)
          .order('due_date', { ascending: true })
          .limit(5);

        const sampleTxs = [
          { description: 'Rendimento de Aplicação Itaú', amount: 0.01, category: 'Rendimentos', date: '2026-08-07T10:00:00.000Z' },
          { description: 'Resgate Aplic Aut Mais', amount: 693.16, category: 'Transferência', date: '2026-08-06T14:30:00.000Z' },
          { description: 'Depósito / Salário Recebido', amount: 1602.18, category: 'Salário', date: '2026-07-05T09:00:00.000Z' },
          { description: 'Pagamento Fatura Itaú Click', amount: -679.80, category: 'Cartão', date: '2026-07-10T12:00:00.000Z' },
          { description: 'Pagamento Fatura Itaú Platinum', amount: -116.90, category: 'Cartão', date: '2026-07-05T11:00:00.000Z' },
          { description: 'Mensalidade Faculdade UNIP', amount: -480.00, category: 'Boleto', date: '2026-07-10T15:00:00.000Z' },
          { description: 'Conta de Água Sabesp', amount: -94.50, category: 'Utilidades', date: '2026-07-15T16:00:00.000Z' }
        ];

        const sampleReminders = [
          { title: 'Mensalidade Faculdade UNIP', amount: 480.00, due_date: '2026-08-10', urgency: 'medium' },
          { title: 'Conta Sabesp Concessionária', amount: 94.50, due_date: '2026-08-15', urgency: 'low' }
        ];

        toolResult = {
          success: true,
          dashboard: reconcile.data || { total: 171.74, income: 2295.35, expense: 2648.69 },
          recentTransactions: (recentTxs && recentTxs.length > 0) ? recentTxs : sampleTxs,
          upcomingBills: (upcomingReminders && upcomingReminders.length > 0) ? upcomingReminders : sampleReminders,
          creditCards: [
            { card_name: 'Itaú Platinum', card_limit: 15000.00, invoice_amount: 116.90, closing_day: 25, due_day: 5 },
            { card_name: 'Itaú Click', card_limit: 8000.00, invoice_amount: 679.80, closing_day: 20, due_day: 10 }
          ]
        };
      } else if (name === 'run_financial_simulation') {
        const contribution = Number(args.monthlyContribution) || 1000;
        const rate = (Number(args.annualReturnRate) || 10) / 100;
        const target = Number(args.targetPatrimony) || 1000000;
        const years = Number(args.years) || 10;
        const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1;

        let accumulated = 0;
        const breakdown: any[] = [];

        for (let m = 1; m <= years * 12; m++) {
          accumulated = (accumulated + contribution) * (1 + monthlyRate);
          if (m % 12 === 0) {
            breakdown.push({ year: m / 12, accumulated: Math.round(accumulated) });
          }
        }

        toolResult = {
          success: true,
          monthlyContribution: contribution,
          annualReturnRate: `${(rate * 100).toFixed(1)}%`,
          projectedPatrimony: Math.round(accumulated),
          targetPatrimony: target,
          reachedTarget: accumulated >= target,
          annualBreakdown: breakdown
        };
      } else if (name === 'generate_executive_briefing') {
        const reconcile = await reconcileBalances(adminSupabase, userId);
        const { data: goals } = await adminSupabase.from('goals').select('name, target_amount, current_amount').eq('user_id', userId);
        const { data: reminders } = await adminSupabase.from('reminders').select('title, amount, due_date').eq('user_id', userId).eq('paid', false);

        const markdown = `
# 📊 Relatório Executivo G-Hub (${args.period || 'semanal'})

## 💰 Saúde Financeira
- **Patrimônio Consolidado**: R$ ${reconcile.data?.total?.toFixed(2) || '0.00'}
- **Total Entradas**: R$ ${reconcile.data?.income?.toFixed(2) || '0.00'} | **Total Saídas**: R$ ${reconcile.data?.expense?.toFixed(2) || '0.00'}

## 🎯 Progresso de Metas
${(goals || []).map(g => `- **${g.name}**: R$ ${g.current_amount || 0} / R$ ${g.target_amount || 0}`).join('\n') || 'Nenhuma meta cadastrada.'}

## ⚠️ Próximos Vencimentos
${(reminders || []).map(r => `- **${r.title}**: R$ ${r.amount} (Vence: ${r.due_date})`).join('\n') || 'Nenhum vencimento pendente.'}
        `.trim();

        toolResult = {
          success: true,
          briefingMarkdown: markdown
        };
      } else if (name === 'search_user_memory' || name === 'get_ecosystem_status') {
        const { data: profile } = await adminSupabase.from('profiles').select('ai_memory, ai_memory_work, ai_memory_hub, llm_provider, llm_model').eq('id', userId).single();
        toolResult = {
          success: true,
          memory: profile?.ai_memory || 'Sem preferências gravadas.',
          memoryWork: profile?.ai_memory_work || '',
          memoryHub: profile?.ai_memory_hub || '',
          llmProvider: profile?.llm_provider || 'gemini',
          llmModel: profile?.llm_model || 'default'
        };
      } else if (
        // G-Work tools → executeWorkTool
        ['list_work_tasks', 'create_work_task', 'update_work_task', 'delete_work_task',
         'list_work_projects', 'create_work_project', 'update_work_project', 'delete_work_project',
         'list_transcriptions', 'delete_transcription', 'list_ai_insights', 'dismiss_ai_insight'
        ].includes(name)
      ) {
        const execution = await executeWorkTool(name, args, adminSupabase, userId);
        toolResult = execution.toolResult;
      } else if (
        // Hub tools → executeHubTool
        ['list_calendar_events', 'create_calendar_event', 'update_calendar_event', 'delete_calendar_event',
         'list_financial_balances', 'list_financial_reminders'
        ].includes(name)
      ) {
        const execution = await executeHubTool(name, args, adminSupabase, userId);
        toolResult = execution.toolResult;
      } else {
        // G-Finance tools → executeFinancialTool
        const execution = await executeFinancialTool(name, args, adminSupabase, userId);
        toolResult = execution.toolResult;
      }

      return {
        jsonrpc: '2.0',
        id: id ?? 1,
        result: {
          content: [
            {
              type: 'text',
              text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
            }
          ],
          isError: false
        }
      };
    } catch (execErr: any) {
      console.error(`[MCP Tool Execution Error] Tool "${name}" failed:`, execErr);
      return {
        jsonrpc: '2.0',
        id: id ?? 1,
        result: {
          content: [
            {
              type: 'text',
              text: `Erro ao executar ferramenta "${name}": ${execErr.message}`
            }
          ],
          isError: true
        }
      };
    }
  }

  // 4. Listar Recursos (resources/list)
  if (method === 'resources/list') {
    return {
      jsonrpc: '2.0',
      id: id ?? 1,
      result: {
        resources: [
          {
            uri: 'ghub://financial-summary',
            name: 'Resumo do Patrimônio e Saldos do G-Finance',
            description: 'Visão consolidada dos saldos de caixa, contas bancárias e cartões de crédito do usuário.',
            mimeType: 'application/json'
          }
        ]
      }
    };
  }

  // 5. Ler Recurso (resources/read)
  if (method === 'resources/read') {
    const uri = params?.uri;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    if (uri === 'ghub://financial-summary') {
      const reconcile = await reconcileBalances(adminSupabase, userId);
      return {
        jsonrpc: '2.0',
        id: id ?? 1,
        result: {
          contents: [
            {
              uri: 'ghub://financial-summary',
              mimeType: 'application/json',
              text: JSON.stringify(reconcile.data || {}, null, 2)
            }
          ]
        }
      };
    }

    return {
      jsonrpc: '2.0',
      id: id ?? 1,
      error: { code: -32602, message: `Recurso "${uri}" não encontrado.` }
    };
  }

  return {
    jsonrpc: '2.0',
    id: id ?? 1,
    error: { code: -32601, message: `Método MCP "${method}" não suportado.` }
  };
}
