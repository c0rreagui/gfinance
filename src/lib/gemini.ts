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
  oauthToken?: string
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
    
    Diretrizes de resposta:
    1. Baseie-se APENAS nos dados fornecidos acima. Se o usuário perguntar algo que não está nessas tabelas, responda polidamente que não possui acesso a esse dado histórico específico no momento.
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

  // Caminho API Key: SDK padrão com startChat
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction: { text: systemPrompt },
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
  const result = await chat.sendMessage(query);
  return result.response.text();
}
