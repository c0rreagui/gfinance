/**
 * src/lib/gemini.ts
 *
 * Módulo Core do Gemini AI Brain do G-Finance.
 * Fornece:
 * 1. Parser Multimodal (extratos PDF/imagens de qualquer banco) com Structured JSON Outputs.
 * 2. Analista Financeiro Conversacional com injeção de contexto (saldos, transações, metas) em tempo real.
 *
 * Autenticação:
 * - Se `oauthToken` (Google Cloud Platform Bearer token) for fornecido, usa a REST API
 *   diretamente via fetch com o header `Authorization: Bearer <token>`.
 *   Isso é necessário pois o SDK @google/generative-ai não suporta OAuth Bearer tokens.
 * - Se não, usa o SDK padrão com a GEMINI_API_KEY configurada no .env.local.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { reconcileBalances } from './reconcile';

const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-flash-latest';

const apiKey = process.env.GEMINI_API_KEY;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    throw new Error(
      'GEMINI_API_KEY não configurada. Adicione sua chave de API no arquivo .env.local ou conecte sua conta Google em Configurações.'
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

export interface AITransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  icon: string;
}

// ---------------------------------------------------------------------------
// Helper: chamada REST direta ao Gemini API com OAuth Bearer token
// ---------------------------------------------------------------------------
async function callGeminiREST(
  modelName: string,
  payload: object,
  oauthToken: string
): Promise<any> {
  const url = `${GEMINI_REST_BASE}/models/${modelName}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${oauthToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini API (OAuth) retornou ${response.status}: ${errorBody}`
    );
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Parser Multimodal: extrai lançamentos de extratos de qualquer banco
// ---------------------------------------------------------------------------
export async function parseStatementWithAI(
  fileBuffer: Buffer,
  mimeType: string,
  oauthToken?: string
): Promise<AITransaction[]> {
  const prompt = `
    Analise o extrato financeiro fornecido (PDF ou Imagem).
    Extraia TODOS os lançamentos individuais de movimentações ocorridas na conta.
    
    Regras de negócio:
    1. IGNORE completamente saldos, totais consolidados, avisos e avisos publicitários do banco.
    2. Formate as datas estritamente no padrão ISO (YYYY-MM-DD).
    3. Categorize cada lançamento nas seguintes classes padrão:
       - 'Alimentação' (supermercados, restaurantes)
       - 'Salário' (recebimento salarial, folha)
       - 'Cartão' (pagamento de fatura)
       - 'Utilidades' (água, luz, gás, saneamento, internet)
       - 'Transporte' (uber, postos, pedágios)
       - 'Assinaturas' (netflix, spotify, assinaturas recorrentes)
       - 'Boleto' (títulos pagos)
       - 'Rendimentos' (juros creditados, resgates de aplicação)
       - 'Transferência' (Pix enviados/recebidos comuns)
       - 'Saúde' (farmácias, planos de saúde)
       - 'Outros' (se não encaixar em nenhuma anterior)
    4. Defina os ícones Lucide correspondentes:
       - 'Alimentação' -> 'ShoppingCart'
       - 'Salário' -> 'Wallet'
       - 'Cartão' -> 'CreditCard'
       - 'Utilidades' -> 'Zap'
       - 'Transporte' -> 'Car'
       - 'Assinaturas' -> 'Tv'
       - 'Boleto' -> 'FileText'
       - 'Rendimentos' -> 'Activity'
       - 'Transferência' -> 'Wallet'
       - 'Saúde' -> 'Heart'
       - 'Outros' -> 'Activity'
    5. Mantenha os sinais monetários exatos (valores negativos para saídas, positivos para entradas).
    
    Retorne EXCLUSIVAMENTE um JSON válido no formato:
    {"transactions": [{"date":"YYYY-MM-DD","description":"...","amount":0.0,"category":"...","icon":"..."}]}
  `;

  const fileBase64 = fileBuffer.toString('base64');

  const hasApiKey = apiKey && apiKey !== 'your-gemini-api-key-here';

  if (oauthToken && !hasApiKey) {
    // Caminho OAuth: REST API direta
    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: fileBase64 } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      }
    };

    const json = await callGeminiREST(DEFAULT_MODEL, payload, oauthToken);
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(text);
    return parsed.transactions || [];
  }

  // Caminho API Key: SDK padrão com Structured Outputs
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          transactions: {
            type: SchemaType.ARRAY,
            description: 'Lista de lançamentos extraídos do extrato bancário',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                date: { type: SchemaType.STRING, description: 'Data ISO (YYYY-MM-DD)' },
                description: { type: SchemaType.STRING, description: 'Descrição do lançamento' },
                amount: { type: SchemaType.NUMBER, description: 'Valor (negativo=saída, positivo=entrada)' },
                category: { type: SchemaType.STRING, description: 'Categoria do lançamento' },
                icon: { type: SchemaType.STRING, description: 'Ícone Lucide' },
              },
              required: ['date', 'description', 'amount', 'category', 'icon'],
            },
          },
        },
        required: ['transactions'],
      },
    },
  });

  const filePart = { inlineData: { data: fileBase64, mimeType } };
  const result = await model.generateContent([prompt, filePart]);
  const responseText = result.response.text();

  try {
    const parsed = JSON.parse(responseText);
    return parsed.transactions || [];
  } catch (err) {
    console.error('[Gemini AI Brain] Erro ao processar o JSON de retorno do Gemini:', err);
    throw new Error('Falha ao processar os dados estruturados de IA de retorno.');
  }
}

// ---------------------------------------------------------------------------
// Definições de Ferramentas (Tools) do Gemini AI Brain
// ---------------------------------------------------------------------------
const geminiTools = [
  {
    functionDeclarations: [
      {
        name: 'list_user_transactions',
        description: 'Lista transações financeiras reais do usuário no G-Finance. Retorna UUIDs, descrições, valores, categorias e datas.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            searchQuery: { type: SchemaType.STRING, description: 'Termo de busca opcional para filtrar por descrição (ex: Netflix, Mercado)' },
            category: { type: SchemaType.STRING, description: 'Categoria opcional para filtrar transações (ex: Alimentação, Salário, Cartão, Utilidades, Transporte, Assinaturas, Boleto, Saúde, Outros)' },
            limit: { type: SchemaType.NUMBER, description: 'Limite máximo de registros a retornar (padrão 30)' }
          }
        }
      },
      {
        name: 'create_user_transaction',
        description: 'Cria/insere uma nova transação financeira (receita ou despesa) no banco de dados do usuário no G-Finance.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            description: { type: SchemaType.STRING, description: 'Descrição textual clara do lançamento (ex: Uber, Mercado, Freelance)' },
            amount: { type: SchemaType.NUMBER, description: 'Valor monetário. Valores negativos para despesas/saídas, valores positivos para receitas/entradas.' },
            category: { type: SchemaType.STRING, description: 'Categoria exata da transação (Alimentação, Salário, Cartão, Utilidades, Transporte, Assinaturas, Boleto, Rendimentos, Transferência, Saúde, Outros)' },
            date: { type: SchemaType.STRING, description: 'Data opcional do lançamento no formato ISO (YYYY-MM-DD)' }
          },
          required: ['description', 'amount', 'category']
        }
      },
      {
        name: 'update_user_transaction',
        description: 'Modifica um ou mais campos de uma transação financeira existente do usuário.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            transactionId: { type: SchemaType.STRING, description: 'O UUID único identificador da transação a ser modificada.' },
            description: { type: SchemaType.STRING, description: 'Nova descrição opcional' },
            amount: { type: SchemaType.NUMBER, description: 'Novo valor opcional (negativo para despesa, positivo para receita)' },
            category: { type: SchemaType.STRING, description: 'Nova categoria opcional' },
            date: { type: SchemaType.STRING, description: 'Nova data opcional no formato ISO (YYYY-MM-DD)' }
          },
          required: ['transactionId']
        }
      },
      {
        name: 'delete_user_transaction',
        description: 'Remove definitivamente uma única transação financeira do usuário no banco de dados pelo seu UUID.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            transactionId: { type: SchemaType.STRING, description: 'O UUID único identificador da transação a ser deletada.' }
          },
          required: ['transactionId']
        }
      },
      {
        name: 'delete_user_transactions',
        description: 'Exclui uma ou mais transações financeiras do usuário no banco de dados. Pode excluir uma lista específica de IDs, filtrar por categoria ou apagar TODAS as transações do histórico de uma vez.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            transactionIds: { 
              type: SchemaType.ARRAY, 
              items: { type: SchemaType.STRING },
              description: 'Lista opcional de UUIDs das transações a serem excluídas.' 
            },
            deleteAll: { 
              type: SchemaType.BOOLEAN, 
              description: 'Se true, remove TODAS as transações do usuário logado (limpa o histórico).' 
            },
            category: { 
              type: SchemaType.STRING, 
              description: 'Remove todas as transações de uma categoria específica.' 
            }
          }
        }
      },
      {
        name: 'list_user_reminders',
        description: 'Lista contas a pagar, dívidas ou assinaturas recorrentes do usuário. Permite filtrar por assinaturas (isRecurring) e status pago.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            isRecurring: { type: SchemaType.BOOLEAN, description: 'Filtrar por assinaturas recorrentes (true) ou dívidas pontuais (false)' },
            paid: { type: SchemaType.BOOLEAN, description: 'Filtrar por status pago (true/false)' }
          }
        }
      },
      {
        name: 'create_user_reminder',
        description: 'Cria uma nova conta a pagar, dívida ou assinatura recorrente na tabela reminders do usuário.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, description: 'Título identificador da conta/dívida/assinatura (ex: Netflix, Fatura Light, Empréstimo)' },
            amount: { type: SchemaType.NUMBER, description: 'Valor financeiro (positivo, pois representa a obrigação).' },
            dueDate: { type: SchemaType.STRING, description: 'Data de vencimento em formato ISO (YYYY-MM-DD)' },
            urgency: { type: SchemaType.STRING, description: 'Grau de urgência da dívida (high, medium, low)' },
            isRecurring: { type: SchemaType.BOOLEAN, description: 'Se true, é tratado como assinatura recorrente mensal. Se false, é uma dívida/compromisso pontual.' },
            paid: { type: SchemaType.BOOLEAN, description: 'Status inicial de pagamento (padrão false)' }
          },
          required: ['title', 'amount', 'dueDate']
        }
      },
      {
        name: 'update_user_reminder',
        description: 'Atualiza detalhes de uma conta a pagar, dívida ou assinatura existente (incluindo marcar como pago ou alterar o valor/data).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            reminderId: { type: SchemaType.STRING, description: 'UUID único identificador do lembrete/dívida/assinatura.' },
            title: { type: SchemaType.STRING, description: 'Novo título' },
            amount: { type: SchemaType.NUMBER, description: 'Novo valor' },
            dueDate: { type: SchemaType.STRING, description: 'Nova data de vencimento (YYYY-MM-DD)' },
            urgency: { type: SchemaType.STRING, description: 'Nova urgência (high, medium, low)' },
            isRecurring: { type: SchemaType.BOOLEAN, description: 'Alterar se é recorrente' },
            paid: { type: SchemaType.BOOLEAN, description: 'Marcar como pago (true) ou não pago (false)' }
          },
          required: ['reminderId']
        }
      },
      {
        name: 'delete_user_reminder',
        description: 'Remove permanentemente uma dívida, conta ou assinatura do usuário pelo UUID.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            reminderId: { type: SchemaType.STRING, description: 'UUID do lembrete a ser removido.' }
          },
          required: ['reminderId']
        }
      },
      {
        name: 'list_user_goals',
        description: 'Lista as metas de investimento e patrimônio ativas do usuário.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'create_user_goal',
        description: 'Cria uma nova meta de investimento ou patrimônio para o usuário.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: 'Nome descritivo da meta (ex: Reserva de Emergência, Viagem Japão)' },
            targetAmount: { type: SchemaType.NUMBER, description: 'Valor alvo/final da meta' },
            currentAmount: { type: SchemaType.NUMBER, description: 'Valor atual acumulado (padrão 0)' },
            color: { type: SchemaType.STRING, description: 'Nome da cor identificadora (emerald, blue, indigo, amber, pink, violet, teal, rose, red, green, orange)' }
          },
          required: ['name', 'targetAmount']
        }
      },
      {
        name: 'update_user_goal',
        description: 'Atualiza uma meta de investimento existente, permitindo alterar o nome, valor alvo, valor atualizado ou a cor.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            goalId: { type: SchemaType.STRING, description: 'UUID único identificador da meta.' },
            name: { type: SchemaType.STRING, description: 'Novo nome descritivo' },
            targetAmount: { type: SchemaType.NUMBER, description: 'Novo valor alvo/final' },
            currentAmount: { type: SchemaType.NUMBER, description: 'Novo valor acumulado' },
            color: { type: SchemaType.STRING, description: 'Nova cor' }
          },
          required: ['goalId']
        }
      },
      {
        name: 'delete_user_goal',
        description: 'Remove definitivamente uma meta de investimento pelo seu UUID.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            goalId: { type: SchemaType.STRING, description: 'UUID da meta a ser excluída.' }
          },
          required: ['goalId']
        }
      }
    ]
  }
];

// ---------------------------------------------------------------------------
// Analista Financeiro Conversacional
// ---------------------------------------------------------------------------
export async function generateFinancialResponse(
  query: string,
  financialContext: {
    balances: any[];
    transactions: any[];
    goals: any[];
    reminders: any[];
  },
  chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
  oauthToken?: string,
  supabaseClient?: any
): Promise<string> {
  const systemPrompt = `
    Você é o "Gemini Brain", a mente analítica por trás do G-Finance (plataforma de controle financeiro premium do Guilherme, CTO & Fundador).
    Sua persona é direta, elegante, altamente profissional e orientada a dados. Evite introduções longas ou termos exageradamente alegres.
    
    Abaixo estão os dados financeiros ATUAIS do Guilherme recuperados em tempo real do banco de dados (Supabase):
    
    ---
    SALDOS E MÉTRICAS ATUAIS:
    ${JSON.stringify(financialContext.balances, null, 2)}
    
    LANÇAMENTOS RECENTES:
    ${JSON.stringify(financialContext.transactions, null, 2)}
    
    METAS DE INVESTIMENTO:
    ${JSON.stringify(financialContext.goals, null, 2)}
    
    PRÓXIMOS PAGAMENTOS (FATURAS E REMINDERS):
    ${JSON.stringify(financialContext.reminders, null, 2)}
    ---
    
    Você possui ferramentas para GERENCIAR as transações do usuário no banco de dados (ex: criar transação se ele pedir pra adicionar gasto/ganho, excluir transação se ele pedir pra apagar ou relatar duplicidade, etc.). 
    Sempre use essas ferramentas de forma direta se o usuário solicitar qualquer alteração operacional!
    
    Diretrizes de resposta:
    1. Baseie-se nos dados fornecidos e nos resultados da execução das ferramentas. Se o usuário perguntar algo que não está nas tabelas e não puder ser buscado via listagem, responda polidamente que não possui acesso a esse dado histórico específico no momento.
    2. Ao citar valores monetários, formate no padrão monetário do Brasil (ex: R$ 1.250,50).
    3. Se houver despesas excessivas ou saldo negativo, aponte insights práticos para redução de gastos baseados nos maiores boletos/cartões da lista de transações recentes.
    4. Use markdown leve (negritos, listas) para estruturar as análises de forma refinada.
    5. Fale estritamente em português brasileiro (pt-BR).
  `;

  const hasApiKey = apiKey && apiKey !== 'your-gemini-api-key-here';

  if (oauthToken && !hasApiKey) {
    // Caminho OAuth: REST API direta (chat via contents array com histórico)
    const contents: any[] = [];

    // Injetar system prompt como primeira mensagem do modelo (turn alternado)
    // Na REST API do Gemini, usamos system_instruction separado
    for (const msg of chatHistory) {
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.parts[0].text }],
      });
    }

    // Adiciona a pergunta atual do usuário
    contents.push({ role: 'user', parts: [{ text: query }] });

    const payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      }
    };

    const json = await callGeminiREST(DEFAULT_MODEL, payload, oauthToken);
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const reason = json.candidates?.[0]?.finishReason || 'UNKNOWN';
      throw new Error(`Gemini não retornou texto. Motivo: ${reason}`);
    }
    return text;
  }

  // Caminho API Key: SDK padrão com startChat e suporte a Function Calling
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction: { text: systemPrompt },
    tools: supabaseClient ? (geminiTools as any) : undefined, // Só habilita ferramentas de escrita se o client Supabase autenticado for fornecido
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
    }
  });

  const formattedHistory = chatHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.parts[0].text }],
  }));

  const chat = model.startChat({ history: formattedHistory });
  let result = await chat.sendMessage(query);
  let functionCalls = result.response.functionCalls();

  let loopCount = 0;
  const MAX_LOOPS = 5;

  // Loop de resolução consecutiva de ferramentas (Tool Calling Loop)
  while (functionCalls && functionCalls.length > 0 && loopCount < MAX_LOOPS) {
    loopCount++;
    console.info(`[Gemini Brain Tool Execution] Executando ${functionCalls.length} chamadas solicitadas pela IA.`);
    
    const functionResponses = [];
    let databaseModified = false;
    let loggedUserId: string | null = null;

    for (const call of functionCalls) {
      const { name, args } = call;
      console.info(`[Gemini Brain Tool Execution] Iniciando "${name}" com argumentos:`, args);

      let toolResult: any;

      try {
        if (!supabaseClient) {
          throw new Error('SupabaseClient não fornecido para execução de ferramentas de escrita.');
        }

        // Recuperar sessão ativa segura do usuário logado
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Usuário do Supabase não identificado.');
        const userId = user.id;
        loggedUserId = userId;

        if (name === 'list_user_transactions') {
          const { searchQuery, category, limit } = args as any;
          let queryBuilder = supabaseClient.from('transactions').select('*').eq('user_id', userId);
          
          if (category) queryBuilder = queryBuilder.eq('category', category);
          if (searchQuery) queryBuilder = queryBuilder.ilike('description', `%${searchQuery}%`);
          
          const { data, error } = await queryBuilder
            .order('date', { ascending: false })
            .limit(limit || 30);

          if (error) throw error;
          toolResult = { success: true, transactions: data || [] };

        } else if (name === 'create_user_transaction') {
          const { description, amount, category, date } = args as any;
          const icon = amount > 0 ? 'ArrowDownLeft' : 'CreditCard';

          const { data, error } = await supabaseClient.from('transactions').insert({
            user_id: userId,
            description,
            amount: Number(amount),
            category,
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            icon
          }).select('*');

          if (error) throw error;

          databaseModified = true;
          toolResult = { success: true, created: data?.[0] };

        } else if (name === 'update_user_transaction') {
          const { transactionId, description, amount, category, date } = args as any;
          const updates: any = {};
          
          if (description) updates.description = description;
          if (amount !== undefined) {
            updates.amount = Number(amount);
            updates.icon = amount > 0 ? 'ArrowDownLeft' : 'CreditCard';
          }
          if (category) updates.category = category;
          if (date) updates.date = new Date(date).toISOString();

          const { data, error } = await supabaseClient
            .from('transactions')
            .update(updates)
            .eq('id', transactionId)
            .eq('user_id', userId)
            .select('*');

          if (error) throw error;

          databaseModified = true;
          toolResult = { success: true, updated: data?.[0] };

        } else if (name === 'delete_user_transaction') {
          const { transactionId } = args as any;

          const { data, error } = await supabaseClient
            .from('transactions')
            .delete()
            .eq('id', transactionId)
            .eq('user_id', userId)
            .select('*');

          if (error) throw error;

          databaseModified = true;
          toolResult = { success: true, deleted: data };

        } else if (name === 'delete_user_transactions') {
          const { transactionIds, deleteAll, category } = args as any;
          let queryBuilder = supabaseClient.from('transactions').delete().eq('user_id', userId);

          if (deleteAll) {
            console.info(`[Gemini Tool] Executando exclusão completa de todas as transações do usuário: ${userId}`);
          } else if (transactionIds && transactionIds.length > 0) {
            queryBuilder = queryBuilder.in('id', transactionIds);
          } else if (category) {
            queryBuilder = queryBuilder.eq('category', category);
          } else {
            throw new Error('Nenhum parâmetro de exclusão fornecido (forneça transactionIds, deleteAll ou category).');
          }

          const { data, error } = await queryBuilder.select('*');
          if (error) throw error;

          databaseModified = true;
          toolResult = { success: true, count: data?.length || 0, deleted: data };

        } else if (name === 'list_user_reminders') {
          const { isRecurring, paid } = args as any;
          let queryBuilder = supabaseClient.from('reminders').select('*').eq('user_id', userId);
          if (isRecurring !== undefined) {
            queryBuilder = queryBuilder.eq('is_recurring', isRecurring);
          }
          if (paid !== undefined) {
            queryBuilder = queryBuilder.eq('paid', paid);
          }
          const { data, error } = await queryBuilder.order('due_date', { ascending: true });
          if (error) throw error;
          toolResult = { success: true, reminders: data || [] };

        } else if (name === 'create_user_reminder') {
          const { title, amount, dueDate, urgency, isRecurring, paid } = args as any;
          const { data, error } = await supabaseClient.from('reminders').insert({
            user_id: userId,
            title,
            amount: Number(amount),
            due_date: new Date(dueDate).toISOString(),
            urgency: urgency || 'low',
            is_recurring: isRecurring || false,
            paid: paid || false
          }).select('*');
          if (error) throw error;
          databaseModified = true;
          toolResult = { success: true, created: data?.[0] };

        } else if (name === 'update_user_reminder') {
          const { reminderId, title, amount, dueDate, urgency, isRecurring, paid } = args as any;
          const updates: any = {};
          if (title !== undefined) updates.title = title;
          if (amount !== undefined) updates.amount = Number(amount);
          if (dueDate !== undefined) updates.due_date = new Date(dueDate).toISOString();
          if (urgency !== undefined) updates.urgency = urgency;
          if (isRecurring !== undefined) updates.is_recurring = isRecurring;
          if (paid !== undefined) updates.paid = paid;

          const { data, error } = await supabaseClient
            .from('reminders')
            .update(updates)
            .eq('id', reminderId)
            .eq('user_id', userId)
            .select('*');
          if (error) throw error;
          databaseModified = true;
          toolResult = { success: true, updated: data?.[0] };

        } else if (name === 'delete_user_reminder') {
          const { reminderId } = args as any;
          const { data, error } = await supabaseClient
            .from('reminders')
            .delete()
            .eq('id', reminderId)
            .eq('user_id', userId)
            .select('*');
          if (error) throw error;
          databaseModified = true;
          toolResult = { success: true, deleted: data };

        } else if (name === 'list_user_goals') {
          const { data, error } = await supabaseClient
            .from('goals')
            .select('*')
            .eq('user_id', userId)
            .order('name', { ascending: true });
          if (error) throw error;
          toolResult = { success: true, goals: data || [] };

        } else if (name === 'create_user_goal') {
          const { name: goalName, targetAmount, currentAmount, color } = args as any;
          const { data, error } = await supabaseClient.from('goals').insert({
            user_id: userId,
            name: goalName,
            target_amount: Number(targetAmount),
            current_amount: Number(currentAmount || 0),
            color: color || 'emerald'
          }).select('*');
          if (error) throw error;
          databaseModified = true;
          toolResult = { success: true, created: data?.[0] };

        } else if (name === 'update_user_goal') {
          const { goalId, name: goalName, targetAmount, currentAmount, color } = args as any;
          const updates: any = {};
          if (goalName !== undefined) updates.name = goalName;
          if (targetAmount !== undefined) updates.target_amount = Number(targetAmount);
          if (currentAmount !== undefined) updates.current_amount = Number(currentAmount);
          if (color !== undefined) updates.color = color;

          const { data, error } = await supabaseClient
            .from('goals')
            .update(updates)
            .eq('id', goalId)
            .eq('user_id', userId)
            .select('*');
          if (error) throw error;
          databaseModified = true;
          toolResult = { success: true, updated: data?.[0] };

        } else if (name === 'delete_user_goal') {
          const { goalId } = args as any;
          const { data, error } = await supabaseClient
            .from('goals')
            .delete()
            .eq('id', goalId)
            .eq('user_id', userId)
            .select('*');
          if (error) throw error;
          databaseModified = true;
          toolResult = { success: true, deleted: data };

        } else {
          throw new Error(`Função de ferramenta desconhecida: ${name}`);
        }
      } catch (err: any) {
        console.error(`[Gemini Brain Tool Execution] Erro ao rodar "${name}":`, err);
        toolResult = { success: false, error: err.message || 'Erro técnico na ferramenta.' };
      }

      functionResponses.push({
        functionResponse: { name, response: toolResult }
      });
    }

    // Executa a reconciliação APENAS UMA VEZ após rodar todo o lote do turno
    if (databaseModified && supabaseClient && loggedUserId) {
      console.info('[Gemini Brain Tool Execution] Batch de alterações detectado. Executando reconciliação única...');
      await reconcileBalances(supabaseClient, loggedUserId);
    }

    // Retorna as execuções de volta ao chat para o Gemini processar
    result = await chat.sendMessage(functionResponses as any);
    functionCalls = result.response.functionCalls();
  }

  return result.response.text();
}
