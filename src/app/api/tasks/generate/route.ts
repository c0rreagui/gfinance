import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export const maxDuration = 300;

// Initialize Gemini SDK client
const apiKey = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

function getGeminiClient(): GoogleGenerativeAI {
  if (!apiKey || apiKey === 'your-gemini-key-here') {
    throw new Error('GEMINI_API_KEY não configurada no arquivo de ambiente.');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Helper function to recursively insert hierarchical work items into Supabase
async function insertWorkItemsRecursive(
  supabase: any,
  userId: string,
  projectId: string | null,
  transcriptionId: string,
  items: any[],
  parentId: string | null = null
): Promise<string[]> {
  const insertedIds: string[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Calculate due_date based on daysFromNow
    let dueDate: string | null = null;
    if (typeof item.daysFromNow === 'number') {
      const date = new Date();
      date.setDate(date.getDate() + item.daysFromNow);
      dueDate = date.toISOString();
    }
    
    // Insert current item
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId,
        title: item.title,
        description: item.description || null,
        status: 'todo', // default status is todo
        priority: item.priority || 'medium',
        type: item.type || 'task',
        parent_id: parentId,
        sort_order: i,
        ai_generated: true,
        ai_confidence: 0.9,
        source_transcription_id: transcriptionId,
        due_date: dueDate
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('[insertWorkItemsRecursive] Error inserting task:', error);
      continue;
    }
    
    const insertedId = data.id;
    insertedIds.push(insertedId);
    
    // If this item has children, recursively insert them under this parent
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      const childIds = await insertWorkItemsRecursive(
        supabase,
        userId,
        projectId,
        transcriptionId,
        item.children,
        insertedId
      );
      insertedIds.push(...childIds);
    }
  }
  
  return insertedIds;
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

    // Generate SHA-256 hash of transcription content for caching/integrity
    const fileHash = crypto
      .createHash('sha256')
      .update(transcription.content)
      .digest('hex');

    // Load static memory templates
    let personaContent = '';
    let almaContent = '';
    let funcoesContent = '';
    try {
      const memoryDir = path.join(process.cwd(), 'src/lib/gwork/memory');
      personaContent = await fs.readFile(path.join(memoryDir, 'persona.md'), 'utf-8');
      almaContent = await fs.readFile(path.join(memoryDir, 'alma.md'), 'utf-8');
      funcoesContent = await fs.readFile(path.join(memoryDir, 'funcoes.md'), 'utf-8');
    } catch (err) {
      console.warn('[Gemini Tasks API] Falha ao ler arquivos estáticos de memória, usando defaults.');
    }

    // Fetch active dynamic memories from database
    const { data: dbMemories, error: memoriesError } = await supabase
      .from('agent_memories')
      .select('content')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    const activeMemoriesText = dbMemories && dbMemories.length > 0
      ? dbMemories.map((m: any, idx: number) => `${idx + 1}. ${m.content}`).join('\n')
      : 'Nenhuma diretriz de memória ativa no momento.';

    // 2. Call Gemini API to analyze raw content and return structured JSON
    const genAI = getGeminiClient();
    const systemPrompt = `
      Você é o G-Work Intelligence Engine, a mente analítica tática de inteligência do Guilherme, fundador & CTO.
      
      Sua identidade, princípios e regras de execução estão definidos nas seções a seguir.
      
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
      ## DIRETRIZES DE MEMÓRIA APRENDIDAS (INSTRUÇÕES DO GUILHERME)
      Estas são regras, preferências ou fatos específicos aprendidos nas reuniões anteriores que você DEVE respeitar:
      ${activeMemoriesText}
      
      ---
      Mapeie os itens de trabalho, prazos e decisões no padrão Azure DevOps.
      Além de tudo isso, extraia NOVAS diretrizes de memória se houver novas preferências, regras explícitas de arquitetura, decisões importantes de design ou fatos novos aprendidos nesta gravação. Retorne-as no campo "extracted_memories" (apenas novas regras relevantes para o futuro, sem repetir as já aprendidas).
    `;

    const textPrompt = `
      Transcrição para análise:
      "${transcription.content}"
    `;

    const responseSchema: any = {
      type: SchemaType.OBJECT,
      properties: {
        summary: {
          type: SchemaType.STRING,
          description: 'Resumo estruturado e executivo da transcrição em português brasileiro (1 a 2 parágrafos).'
        },
        key_decisions: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Decisões cruciais, combinados, arquiteturas ou direcionamentos tomados no áudio.'
        },
        mentioned_people: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Pessoas ou cargos citados na gravação.'
        },
        mentioned_dates: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              label: { type: SchemaType.STRING, description: 'Descrição da data/evento (ex: Entrega da API Itaú).' },
              daysFromNow: { type: SchemaType.INTEGER, description: 'Número de dias a partir de hoje (hoje = 0).' }
            },
            required: ['label', 'daysFromNow']
          },
          description: 'Datas importantes, prazos ou compromissos citados.'
        },
        insights: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              insight_type: {
                type: SchemaType.STRING,
                description: 'Tipo do insight: action_suggestion, deadline_warning, pattern_detected, priority_shift'
              },
              title: { type: SchemaType.STRING, description: 'Título conciso do insight.' },
              body: { type: SchemaType.STRING, description: 'Descrição detalhada e contextualizada do insight.' },
              severity: { type: SchemaType.STRING, description: 'Gravidade: info, warning, critical' }
            },
            required: ['insight_type', 'title', 'body', 'severity']
          },
          description: 'Insights táticos estratégicos extraídos para otimização ou tomada de decisão.'
        },
        work_items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING, description: 'Título claro da iniciativa (Épico).' },
              description: { type: SchemaType.STRING, description: 'Descrição detalhada do Épico.' },
              type: { type: SchemaType.STRING, description: 'Sempre: epic' },
              priority: { type: SchemaType.STRING, description: 'Prioridade: critical, high, medium, low, none' },
              daysFromNow: { type: SchemaType.INTEGER, description: 'Dias recomendados para entrega final do Épico.' },
              children: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING', description: 'Título da Feature.' },
                    description: { type: 'STRING', description: 'Descrição da Feature.' },
                    type: { type: 'STRING', description: 'Sempre: feature' },
                    priority: { type: 'STRING' },
                    daysFromNow: { type: 'INTEGER' },
                    children: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          title: { type: 'STRING', description: 'Título da Story.' },
                          description: { type: 'STRING', description: 'Descrição da Story.' },
                          type: { type: 'STRING', description: 'Sempre: story' },
                          priority: { type: 'STRING' },
                          daysFromNow: { type: 'INTEGER' },
                          children: {
                            type: 'ARRAY',
                            items: {
                              type: 'OBJECT',
                              properties: {
                                title: { type: 'STRING', description: 'Título da Tarefa acionável.' },
                                description: { type: 'STRING', description: 'Descrição da Tarefa.' },
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
          },
          description: 'Estrutura hierárquica de tarefas organizadas como Azure DevOps: Epic -> Feature -> Story -> Task.'
        },
        extracted_memories: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Diretrizes de preferência, fatos ou regras técnicas que o Guilherme determinou nesta gravação e que devem ser gravadas na memória do agente para o futuro (ex: Guilherme prefere Tailwind v4).'
        }
      },
      required: ['summary', 'work_items', 'insights', 'key_decisions', 'mentioned_people', 'mentioned_dates', 'extracted_memories']
    };

    let result = null;
    let selectedModel = '';
    let totalTokenCount = null;
    let responseText = '';
    const modelsToTry = [
      DEFAULT_MODEL,
      'gemini-2.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-2.5-pro'
    ];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini API] Tentando modelo: ${modelName}`);
        const modelClient = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.3
          }
        });

        const apiResult = await modelClient.generateContent([systemPrompt, textPrompt]);
        responseText = apiResult.response.text();
        const usage = apiResult.response.usageMetadata;
        totalTokenCount = usage?.totalTokenCount || null;
        result = apiResult;
        selectedModel = modelName;
        break; // Sucesso! Sair do loop
      } catch (err: any) {
        console.warn(`[Gemini API] Falha ao tentar modelo ${modelName}:`, err.message);
        lastError = err;
        if (err.status === 401 || err.status === 403) {
          throw err;
        }
      }
    }

    if (!result) {
      throw new Error(`Falha técnica em todos os modelos do Gemini. Erro mais recente: ${lastError?.message || 'Serviço Indisponível'}`);
    }

    const parsedJson = JSON.parse(responseText);
    const { summary, insights, work_items: hierarchicalWorkItems } = parsedJson;

    // 3. Insert the hierarchical work items recursively into database
    const allInsertedWorkItemIds = await insertWorkItemsRecursive(
      supabase,
      user.id,
      transcription.project_id,
      transcriptionId,
      hierarchicalWorkItems
    );

    // 4. Insert extracted insights into the ai_insights database
    if (insights && Array.isArray(insights) && insights.length > 0) {
      const insightsToInsert = insights.map((insight: any) => ({
        user_id: user.id,
        insight_type: insight.insight_type,
        title: insight.title,
        body: insight.body,
        severity: insight.severity || 'info',
        related_work_items: allInsertedWorkItemIds,
        related_transcriptions: [transcriptionId],
        dismissed: false,
        acted_on: false
      }));

      const { error: insightsError } = await supabase
        .from('ai_insights')
        .insert(insightsToInsert);

      if (insightsError) {
        console.error('[Gemini Tasks API Error] Failed to insert insights:', insightsError);
      }
    }

    // Format legacy insights text for backwards compatibility in UI
    const formattedInsightsText = insights && Array.isArray(insights)
      ? insights.map((ins: any) => `* **[${ins.severity.toUpperCase()}] ${ins.title}**: ${ins.body}`).join('\n')
      : null;

    // 5. Update the transcription record with AI Results and metadata
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({
        ai_summary: summary,
        ai_insights: formattedInsightsText,
        file_hash: fileHash,
        extracted_entities: {
          work_items: parsedJson.work_items,
          insights: parsedJson.insights,
          summary: parsedJson.summary,
          key_decisions: parsedJson.key_decisions,
          mentioned_people: parsedJson.mentioned_people,
          mentioned_dates: parsedJson.mentioned_dates,
          extracted_memories: parsedJson.extracted_memories || []
        },
        processed_at: new Date().toISOString(),
        gemini_model: selectedModel,
        token_count: totalTokenCount
      })
      .eq('id', transcriptionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Gemini Transcription Update Error] Falha ao atualizar transcrição:', updateError);
    }

    return NextResponse.json({
      success: true,
      summary,
      insights,
      work_items: hierarchicalWorkItems
    });

  } catch (err: any) {
    console.error('[Gemini Tasks API Error] Erro técnico:', err);
    return NextResponse.json({ 
      error: err.message || 'Falha técnica ao processar transcrição com IA.' 
    }, { status: 500 });
  }
}
