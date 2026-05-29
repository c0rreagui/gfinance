import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize Gemini SDK client
const apiKey = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = 'gemini-flash-latest';

function getGeminiClient(): GoogleGenerativeAI {
  if (!apiKey || apiKey === 'your-gemini-key-here') {
    throw new Error('GEMINI_API_KEY não configurada no arquivo de ambiente.');
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { transcriptionId } = body;

    if (!transcriptionId) {
      return NextResponse.json({ error: 'ID de transcrição não fornecido.' }, { status: 400 });
    }

    // 1. Fetch transcription record from database
    const { data: transcription, error: fetchError } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !transcription) {
      return NextResponse.json({ error: 'Transcrição não encontrada ou sem acesso.' }, { status: 404 });
    }

    // 2. Call Gemini API to analyze raw content and return structured JSON
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: DEFAULT_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            summary: { 
              type: SchemaType.STRING, 
              description: 'Resumo conciso da conversa ou gravação em português brasileiro (1 a 2 parágrafos).' 
            },
            insights: { 
              type: SchemaType.STRING, 
              description: 'Insights estratégicos, pontos de atenção e plano geral de ação (1 a 2 parágrafos).' 
            },
            tasks: {
              type: SchemaType.ARRAY,
              description: 'Lista de tarefas concretas extraídas da fala da transcrição.',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { 
                    type: SchemaType.STRING, 
                    description: 'Título direto e de alto nível da tarefa a ser executada.' 
                  },
                  description: { 
                    type: SchemaType.STRING, 
                    description: 'Contexto e detalhes operacionais sobre o que precisa ser feito.' 
                  },
                  priority: { 
                    type: SchemaType.STRING, 
                    description: 'Prioridade estimada da tarefa (deve ser: low, medium ou high).' 
                  },
                  daysFromNow: { 
                    type: SchemaType.INTEGER, 
                    description: 'Quantidade de dias a partir de hoje sugerido para o prazo final (ex: hoje = 0, amanhã = 1, final de semana = 2-3).' 
                  }
                },
                required: ['title', 'description', 'priority', 'daysFromNow']
              }
            }
          },
          required: ['summary', 'insights', 'tasks']
        }
      }
    });

    const systemPrompt = `
      Você é o analista tático de inteligência do Guilherme, CTO & Fundador da G-Finance e Synapse.
      Sua persona é focada, direta e técnica.
      Analise o texto transcrito do áudio fornecido.
      Extraia os pontos centrais para o resumo, elabore insights estratégicos e monte um plano de ação listando tarefas concretas que resolvam o que foi conversado ou solicitado no áudio.
      
      Importante: Se houver referências a prazos no áudio (ex: "até amanhã", "na próxima semana", "daqui a dois dias"), converta corretamente isso no número de dias em relação a hoje ("daysFromNow"). Se não houver prazo claro, atribua um valor razoável de 3 a 5 dias.
    `;

    const textPrompt = `
      Transcrição para análise:
      "${transcription.content}"
    `;

    const result = await model.generateContent([systemPrompt, textPrompt]);
    const responseText = result.response.text();

    const parsedJson = JSON.parse(responseText);
    const { summary, insights, tasks: aiTasks } = parsedJson;

    // 3. Update the transcription record with AI Results
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({
        ai_summary: summary,
        ai_insights: insights
      })
      .eq('id', transcriptionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Gemini Transcription Update Error] Falha ao atualizar resumo no banco:', updateError);
    }

    return NextResponse.json({
      success: true,
      summary,
      insights,
      tasks: aiTasks || []
    });

  } catch (err: any) {
    console.error('[Gemini Tasks API Error] Erro técnico:', err);
    return NextResponse.json({ 
      error: err.message || 'Falha técnica ao processar transcrição com IA.' 
    }, { status: 500 });
  }
}
