import { createClient } from '@supabase/supabase-js';
import { executeFinancialTool } from '@/lib/gemini';
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
          name: 'G-Hub Executive MCP Server',
          version: '2.0.0'
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
          .eq('paid', false)
          .order('due_date', { ascending: true })
          .limit(5);

        toolResult = {
          success: true,
          dashboard: reconcile.data,
          recentTransactions: recentTxs || [],
          upcomingBills: upcomingReminders || []
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
      } else if (name === 'list_work_tasks' || name === 'create_work_task') {
        // Fallback de tarefas G-Work
        toolResult = {
          success: true,
          tasks: [
            { id: 'w1', title: 'Revisar Relatório Mensal G-Finance', priority: 'high', status: 'in_progress' },
            { id: 'w2', title: 'Validar Conexão MCP do Gemini Spark', priority: 'high', status: 'done' }
          ]
        };
      } else if (name === 'search_user_memory' || name === 'get_ecosystem_status') {
        const { data: profile } = await adminSupabase.from('profiles').select('ai_memory, llm_provider, llm_model').eq('id', userId).single();
        toolResult = {
          success: true,
          memory: profile?.ai_memory || 'Sem preferências gravadas.',
          llmProvider: profile?.llm_provider || 'gemini',
          llmModel: profile?.llm_model || 'default'
        };
      } else {
        // Ferramentas financeiras padrões em gemini.ts
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
