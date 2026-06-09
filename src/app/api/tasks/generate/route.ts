import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import crypto from 'crypto';

// Initialize Gemini SDK client
const apiKey = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = 'gemini-2.5-flash';

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

    // 2. Call Gemini API to analyze raw content and return structured JSON
    const genAI = getGeminiClient();
    const systemPrompt = `
      Você é o G-Work Intelligence Engine, a mente analítica tática de inteligência do Guilherme, fundador & CTO.
      Sua persona é de altíssimo nível técnico, direta, focada e pragmática (pense em engenharia de classe mundial, padrão Linear e Stripe).
      Sua missão é ler o áudio transcrito e estruturar um plano de trabalho impecável no padrão Azure DevOps:
      - Epic: Módulos inteiros ou macro-iniciativas (ex: Integração do Banco Itaú, Lançamento do Design System Neo).
      - Feature: Funcionalidades necessárias dentro de um Epic (ex: Rastreamento de reconciliação, Componentes de Switch).
      - Story: Requisitos operacionais ou histórias de usuário que resolvem a Feature (ex: Validar hash de deduplicação na API, Interface do toggle).
      - Task: Itens extremamente concretos, técnicos e acionáveis de código ou infra (ex: Criar unit test no jest para hash, Estilizar Switch CSS).

      Para cada item mapeado, escolha a prioridade ideal (critical, high, medium, low, none) e daysFromNow correspondente com prazos citados (ex: "até amanhã" = 1, "fim de semana" = 4). Caso não cite, use o bom senso (ex: Task = 1-3 dias, Story = 3-5 dias, Feature = 5-7 dias, Epic = 10-15 dias).
      
      Gere também insights estratégicos (tipo de insight: action_suggestion, deadline_warning, pattern_detected, priority_shift) com gravidade (info, warning, critical), resumo conciso, decisões mapeadas, pessoas e prazos importantes.
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
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    title: { type: SchemaType.STRING, description: 'Título da Feature.' },
                    description: { type: SchemaType.STRING, description: 'Descrição da Feature.' },
                    type: { type: SchemaType.STRING, description: 'Sempre: feature' },
                    priority: { type: SchemaType.STRING },
                    daysFromNow: { type: SchemaType.INTEGER },
                    children: {
                      type: SchemaType.ARRAY,
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          title: { type: SchemaType.STRING, description: 'Título da Story.' },
                          description: { type: SchemaType.STRING, description: 'Descrição da Story.' },
                          type: { type: SchemaType.STRING, description: 'Sempre: story' },
                          priority: { type: SchemaType.STRING },
                          daysFromNow: { type: SchemaType.INTEGER },
                          children: {
                            type: SchemaType.ARRAY,
                            items: {
                              type: SchemaType.OBJECT,
                              properties: {
                                title: { type: SchemaType.STRING, description: 'Título da Tarefa acionável.' },
                                description: { type: SchemaType.STRING, description: 'Descrição da Tarefa.' },
                                type: { type: SchemaType.STRING, description: 'Sempre: task' },
                                priority: { type: SchemaType.STRING },
                                daysFromNow: { type: SchemaType.INTEGER }
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
        }
      },
      required: ['summary', 'work_items', 'insights', 'key_decisions', 'mentioned_people', 'mentioned_dates']
    };

    let result = null;
    let selectedModel = '';
    let totalTokenCount = null;
    let responseText = '';
    const modelsToTry = [DEFAULT_MODEL, 'gemini-2.0-flash', 'gemini-1.5-flash'];
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
          mentioned_dates: parsedJson.mentioned_dates
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
