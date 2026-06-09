import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

export const maxDuration = 300;

const apiKey = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

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
    const { transcriptionId, userMessage } = body;

    if (!transcriptionId || !userMessage) {
      return NextResponse.json({ error: 'ID de transcrição ou mensagem do usuário ausente.' }, { status: 400 });
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

    const currentEntities = transcription.extracted_entities as any;
    if (!currentEntities) {
      return NextResponse.json({ error: 'Esta gravação ainda não foi analisada. Execute a análise inicial antes de curar.' }, { status: 400 });
    }

    // Initialize or load chat history
    const chatHistory = currentEntities.chat_history && Array.isArray(currentEntities.chat_history)
      ? [...currentEntities.chat_history]
      : [];

    // Append user message
    chatHistory.push({ role: 'user', content: userMessage });

    // Load static memory templates
    let personaContent = '';
    let almaContent = '';
    let funcoesContent = '';
    let contextoContent = '';
    try {
      const memoryDir = path.join(process.cwd(), 'src/lib/gwork/memory');
      personaContent = await fs.readFile(path.join(memoryDir, 'persona.md'), 'utf-8');
      almaContent = await fs.readFile(path.join(memoryDir, 'alma.md'), 'utf-8');
      funcoesContent = await fs.readFile(path.join(memoryDir, 'funcoes.md'), 'utf-8');
      contextoContent = await fs.readFile(path.join(memoryDir, 'contexto.md'), 'utf-8');
    } catch (err) {
      console.warn('[Curation Chat API] Falha ao ler arquivos estáticos de memória.');
    }

    // Fetch active dynamic memories from database
    const { data: dbMemories } = await supabase
      .from('agent_memories')
      .select('content')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    const activeMemoriesText = dbMemories && dbMemories.length > 0
      ? dbMemories.map((m: any, idx: number) => `${idx + 1}. ${m.content}`).join('\n')
      : 'Nenhuma diretriz de memória activa no momento.';

    // Initialize Gemini API
    const genAI = getGeminiClient();
    
    const systemPrompt = `
      Você é o G-Work Intelligence Engine, a mente analítica tática de inteligência do Guilherme, fundador & CTO.
      
      Você está em um fluxo de curadoria. O Guilherme está revisando a proposta de entregáveis (tarefas, decisões, memórias, insights) que você extraiu da gravação. Ele está conversando diretamente com você para ajustar, expandir, focar ou corrigir essa proposta antes de persistir no Kanban.
      
      Sua identidade, princípios e regras de execução estão definidos a seguir.
      
      ---
      ## PERSONA (COMO VOCÊ SE COMPORTA E FALA)
      ${personaContent || 'Você é focado, pragmático, direto e técnico. Padrão Stripe/Linear.'}
      
      ---
      ## ALMA (DIRETRIZES DE QUALIDADE DO PROJETO)
      ${almaContent || 'Padrão world-class em todas as camadas. Sem mocks ou placeholders.'}
      
      ---
      ## FUNÇÕES E FLUXOS (COMO ESTRUTURAR TAREFAS)
      ${funcoesContent || 'Kanban hierárquico Epic -> Feature -> Story -> Task.'}
      
      ---
      ## CONTEXTO DO USUÁRIO (QUEM É O GUILHERME E PROJETOS)
      ${contextoContent || 'Nome: Guilherme Corrêa. Fundador & CTO.'}
      
      ---
      ## DIRETRIZES DE MEMÓRIA APRENDIDAS (INSTRUÇÕES DO GUILHERME)
      ${activeMemoriesText}

      ---
      ## INSTRUÇÃO DE CURADORIA
      Você deve ajustar a proposta de entregáveis baseando-se no feedback do Guilherme, mantendo a coerência com a gravação original.
      Sempre retorne uma resposta curta e polida direcionada a ele no campo "chat_response", explicando os ajustes que você fez no JSON estruturado.
    `;

    const textPrompt = `
      ---
      ## GRAVAÇÃO ORIGINAL (CONTEXTO)
      "${transcription.content}"

      ---
      ## PROPOSTA DE ENTREGÁVEIS ATUAL (DRAFT)
      ${JSON.stringify({
        summary: currentEntities.summary,
        key_decisions: currentEntities.key_decisions,
        mentioned_people: currentEntities.mentioned_people,
        mentioned_dates: currentEntities.mentioned_dates,
        insights: currentEntities.insights,
        work_items: currentEntities.work_items,
        extracted_memories: currentEntities.extracted_memories || []
      })}

      ---
      ## HISTÓRICO DE CURADORIA
      ${chatHistory.slice(0, -1).map(h => `${h.role === 'user' ? 'Guilherme' : 'IA'}: ${h.content}`).join('\n')}

      ---
      ## NOVA INSTRUÇÃO DO GUILHERME (ALTERAÇÃO SOLICITADA)
      "${userMessage}"
    `;

    const responseSchema: any = {
      type: SchemaType.OBJECT,
      properties: {
        chat_response: {
          type: SchemaType.STRING,
          description: 'Breve resposta profissional explicativa direcionada ao Guilherme sobre o que foi ajustado (padrão Stripe/Linear).'
        },
        summary: {
          type: SchemaType.STRING,
          description: 'Resumo estruturado e executivo ajustado (1 a 2 parágrafos).'
        },
        key_decisions: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Decisões cruciais unificadas/ajustadas.'
        },
        mentioned_people: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Pessoas ou cargos citados.'
        },
        mentioned_dates: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              label: { type: SchemaType.STRING },
              daysFromNow: { type: SchemaType.INTEGER }
            },
            required: ['label', 'daysFromNow']
          }
        },
        insights: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              insight_type: { type: SchemaType.STRING },
              title: { type: SchemaType.STRING },
              body: { type: SchemaType.STRING },
              severity: { type: SchemaType.STRING }
            },
            required: ['insight_type', 'title', 'body', 'severity']
          }
        },
        work_items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING, description: 'Título da iniciativa (Épico).' },
              description: { type: SchemaType.STRING },
              type: { type: SchemaType.STRING, description: 'Sempre: epic' },
              priority: { type: SchemaType.STRING },
              daysFromNow: { type: SchemaType.INTEGER },
              children: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING' },
                    description: { type: 'STRING' },
                    type: { type: 'STRING', description: 'Sempre: feature' },
                    priority: { type: 'STRING' },
                    daysFromNow: { type: 'INTEGER' },
                    children: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          title: { type: 'STRING' },
                          description: { type: 'STRING' },
                          type: { type: 'STRING', description: 'Sempre: story' },
                          priority: { type: 'STRING' },
                          daysFromNow: { type: 'INTEGER' },
                          children: {
                            type: 'ARRAY',
                            items: {
                              type: 'OBJECT',
                              properties: {
                                title: { type: 'STRING' },
                                description: { type: 'STRING' },
                                type: { type: 'STRING', description: 'Sempre: task' },
                                priority: { type: 'STRING' },
                                daysFromNow: { type: 'INTEGER' }
                              },
                              required: ['title', 'type', 'priority']
                            }
                          }
                        },
                        required: ['title', 'type', 'priority']
                      }
                    }
                  },
                  required: ['title', 'type', 'priority']
                }
              }
            },
            required: ['title', 'type', 'priority']
          }
        },
        extracted_memories: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING }
        }
      },
      required: [
        'chat_response',
        'summary',
        'work_items',
        'insights',
        'key_decisions',
        'mentioned_people',
        'mentioned_dates',
        'extracted_memories'
      ]
    };

    let responseText = '';
    let selectedModel = '';
    const modelsToTry = [
      DEFAULT_MODEL,
      'gemini-2.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
      'gemini-flash-latest'
    ];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const modelClient = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2
          }
        });

        const apiResult = await modelClient.generateContent([systemPrompt, textPrompt]);
        responseText = apiResult.response.text();
        selectedModel = modelName;
        break;
      } catch (err: any) {
        console.warn(`[Curation Chat Gemini] Falha no modelo ${modelName}:`, err.message);
        lastError = err;
      }
    }

    if (!responseText) {
      throw new Error(`Falha técnica ao executar curadoria com IA. Erro: ${lastError?.message || 'Erro Desconhecido'}`);
    }

    const parsedJson = JSON.parse(responseText);
    const { chat_response } = parsedJson;

    // Append AI response to chat history
    chatHistory.push({ role: 'model', content: chat_response });

    const updatedEntities = {
      summary: parsedJson.summary,
      key_decisions: parsedJson.key_decisions,
      mentioned_people: parsedJson.mentioned_people,
      mentioned_dates: parsedJson.mentioned_dates,
      insights: parsedJson.insights,
      work_items: parsedJson.work_items,
      extracted_memories: parsedJson.extracted_memories || [],
      chat_history: chatHistory
    };

    // Update transcription with new entities draft
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({
        ai_summary: parsedJson.summary,
        ai_insights: parsedJson.insights && Array.isArray(parsedJson.insights)
          ? parsedJson.insights.map((ins: any) => `* **[${ins.severity.toUpperCase()}] ${ins.title}**: ${ins.body}`).join('\n')
          : null,
        extracted_entities: updatedEntities,
        gemini_model: selectedModel
      })
      .eq('id', transcriptionId)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      chat_response,
      extracted_entities: updatedEntities
    });

  } catch (err: any) {
    console.error('[Curation Chat API Error]:', err);
    return NextResponse.json({ error: err.message || 'Falha ao processar curadoria.' }, { status: 500 });
  }
}
