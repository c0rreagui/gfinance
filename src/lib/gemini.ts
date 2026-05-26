/**
 * src/lib/gemini.ts
 *
 * Módulo Core do Gemini AI Brain do G-Finance.
 * Fornece:
 * 1. Parser Multimodal (extratos PDF/imagens de qualquer banco) com Structured JSON Outputs.
 * 2. Analista Financeiro Conversacional com injeção de contexto (saldos, transações, metas) em tempo real.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    throw new Error(
      'GEMINI_API_KEY não configurada. Por favor, adicione sua chave de API no arquivo .env.local.'
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

/**
 * Utiliza o Gemini 1.5 Flash com Structured Outputs para extrair lançamentos de extratos de qualquer banco.
 */
export async function parseStatementWithAI(
  fileBuffer: Buffer,
  mimeType: string
): Promise<AITransaction[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
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
                date: {
                  type: SchemaType.STRING,
                  description: 'Data do lançamento no formato ISO (YYYY-MM-DD)',
                },
                description: {
                  type: SchemaType.STRING,
                  description: 'Descrição original limpa do lançamento bancário',
                },
                amount: {
                  type: SchemaType.NUMBER,
                  description: 'Valor líquido (positivo para receita/crédito, negativo para despesa/débito)',
                },
                category: {
                  type: SchemaType.STRING,
                  description: 'Categoria inferida: Alimentação, Salário, Cartão, Utilidades, Transporte, Assinaturas, Boleto, Rendimentos, Transferência, Saúde ou Outros',
                },
                icon: {
                  type: SchemaType.STRING,
                  description: 'Ícone Lucide representativo: ShoppingCart, Wallet, CreditCard, Zap, Car, Tv, FileText, Activity ou Heart',
                },
              },
              required: ['date', 'description', 'amount', 'category', 'icon'],
            },
          },
        },
        required: ['transactions'],
      },
    },
  });

  // Converter buffer para Part Part de dados embutidos
  const filePart = {
    inlineData: {
      data: fileBuffer.toString('base64'),
      mimeType,
    },
  };

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
  `;

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

/**
 * Cria uma sessão conversacional com o Gemini injetando o contexto financeiro real do Supabase.
 */
export async function generateFinancialResponse(
  query: string,
  financialContext: {
    balances: any[];
    transactions: any[];
    goals: any[];
    reminders: any[];
  },
  chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

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

  // Converter histórico de chat para o padrão do SDK do Gemini
  const formattedHistory = chatHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.parts[0].text }],
  }));

  const chat = model.startChat({
    history: formattedHistory,
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessage(query);
  return result.response.text();
}
