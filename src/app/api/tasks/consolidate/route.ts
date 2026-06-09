import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import crypto from 'crypto';

export const maxDuration = 300;

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
    
    let dueDate: string | null = null;
    if (typeof item.daysFromNow === 'number') {
      const date = new Date();
      date.setDate(date.getDate() + item.daysFromNow);
      dueDate = date.toISOString();
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId,
        title: item.title,
        description: item.description || null,
        status: 'todo',
        priority: item.priority || 'medium',
        type: item.type || 'task',
        parent_id: parentId,
        sort_order: i,
        ai_generated: true,
        ai_confidence: 0.95, // Higher confidence for consolidated strategic tasks
        source_transcription_id: transcriptionId,
        due_date: dueDate
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('[Consolidate - insertWorkItemsRecursive] Error inserting task:', error);
      continue;
    }
    
    const insertedId = data.id;
    insertedIds.push(insertedId);
    
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
    const { transcriptionIds } = body;

    if (!transcriptionIds || !Array.isArray(transcriptionIds) || transcriptionIds.length < 2) {
      return NextResponse.json({ error: 'IDs de transcrição insuficientes para consolidação.' }, { status: 400 });
    }

    // 1. Fetch the target transcription records from database
    const { data: transcriptions, error: fetchError } = await supabase
      .from('transcriptions')
      .select('*')
      .in('id', transcriptionIds)
      .eq('user_id', user.id);

    if (fetchError || !transcriptions || transcriptions.length === 0) {
      return NextResponse.json({ error: 'Nenhuma transcrição encontrada ou sem acesso.' }, { status: 404 });
    }

    // Sort IDs to make deduplication hash deterministic
    const sortedIds = [...transcriptionIds].sort();
    const fileHash = crypto
      .createHash('sha256')
      .update(`consolidated-${sortedIds.join('-')}`)
      .digest('hex');

    // 2. Format the combined transcriptions content & summaries for Gemini context
    const combinedContent = transcriptions.map((tr, index) => {
      return `Gravação #${index + 1}:
Título do Arquivo: ${tr.file_name}
Data da Transcrição: ${new Date(tr.transcribed_at).toLocaleDateString('pt-BR')}
Projeto: ${tr.project_id || 'Nenhum'}

Resumo Individual da IA:
${tr.ai_summary || 'Sem resumo individual gerado.'}

Conteúdo Transcrito Bruto (Trecho):
${tr.content.substring(0, 2500)}${tr.content.length > 2500 ? '...' : ''}
`;
    }).join('\n\n---\n\n');

    // Mapped project: if all selected transcriptions share the same project_id, use that project. Otherwise null.
    const projectIds = transcriptions.map(t => t.project_id).filter(Boolean);
    const uniqueProjectIds = Array.from(new Set(projectIds));
    const finalProjectId = uniqueProjectIds.length === 1 ? uniqueProjectIds[0] : null;

    // 3. Call Gemini API to perform consolidation and return structured JSON
    const genAI = getGeminiClient();
    const systemPrompt = `
      Você é o G-Work Consolidation Engine, a mente analítica estratégica de inteligência do Guilherme, fundador & CTO.
      Sua persona é de altíssimo nível técnico, direta, focada e pragmática (padrão Linear e Stripe).
      Sua missão é receber os resumos e conteúdos de várias reuniões/gravações e elaborar a **Análise Geral das Análises Individuais**.
      Diferente de analisar uma gravação isolada, você deve conectar os pontos entre as reuniões, identificar redundâncias, remover tarefas duplicadas, e criar um **Plano de Trabalho Consolidado e Sinérgico** no padrão Azure DevOps (Epic -> Feature -> Story -> Task).
      
      Para cada item mapeado, escolha a prioridade ideal (critical, high, medium, low, none) e daysFromNow correspondente com prazos unificados (ex: "até amanhã" = 1, "fim de semana" = 4). Caso não cite, use o bom senso.
      
      Gere também insights estratégicos consolidados (insight_type: action_suggestion, deadline_warning, pattern_detected, priority_shift) com gravidade (info, warning, critical), resumo geral consolidado, decisões unificadas, pessoas citadas e datas integradas.
    `;

    const textPrompt = `
      Fontes de Transcrições a Consolidar:
      ${combinedContent}
    `;

    const responseSchema: any = {
      type: SchemaType.OBJECT,
      properties: {
        summary: {
          type: SchemaType.STRING,
          description: 'Resumo geral consolidado e executivo das reuniões em português brasileiro (1 a 2 parágrafos).'
        },
        key_decisions: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Decisões cruciais, combinados, arquiteturas ou direcionamentos estratégicos unificados tomados ao longo das reuniões.'
        },
        mentioned_people: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Pessoas ou cargos citados de forma relevante nas gravações.'
        },
        mentioned_dates: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              label: { type: SchemaType.STRING, description: 'Descrição da data/evento consolidado.' },
              daysFromNow: { type: SchemaType.INTEGER, description: 'Número de dias a partir de hoje (hoje = 0).' }
            },
            required: ['label', 'daysFromNow']
          },
          description: 'Datas importantes, prazos finais unificados ou compromissos combinados.'
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
              title: { type: SchemaType.STRING, description: 'Título conciso do insight consolidado.' },
              body: { type: SchemaType.STRING, description: 'Descrição detalhada e contextualizada do padrão ou insight observado.' },
              severity: { type: SchemaType.STRING, description: 'Gravidade: info, warning, critical' }
            },
            required: ['insight_type', 'title', 'body', 'severity']
          },
          description: 'Insights estratégicos consolidados de alto nível.'
        },
        work_items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING, description: 'Título claro da iniciativa consolidada (Épico).' },
              description: { type: SchemaType.STRING, description: 'Descrição detalhada do Épico.' },
              type: { type: SchemaType.STRING, description: 'Sempre: epic' },
              priority: { type: SchemaType.STRING, description: 'Prioridade: critical, high, medium, low, none' },
              daysFromNow: { type: SchemaType.INTEGER, description: 'Dias recomendados para entrega final do Épico.' },
              children: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING', description: 'Título da Feature consolidada.' },
                    description: { type: 'STRING', description: 'Descrição da Feature.' },
                    type: { type: 'STRING', description: 'Sempre: feature' },
                    priority: { type: 'STRING' },
                    daysFromNow: { type: 'INTEGER' },
                    children: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          title: { type: 'STRING', description: 'Título da Story consolidada.' },
                          description: { type: 'STRING', description: 'Descrição da Story.' },
                          type: { type: 'STRING', description: 'Sempre: story' },
                          priority: { type: 'STRING' },
                          daysFromNow: { type: 'INTEGER' },
                          children: {
                            type: 'ARRAY',
                            items: {
                              type: 'OBJECT',
                              properties: {
                                title: { type: 'STRING', description: 'Título da Tarefa consolidada.' },
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
          description: 'Estrutura consolidada de tarefas sem redundâncias: Epic -> Feature -> Story -> Task.'
        }
      },
      required: ['summary', 'work_items', 'insights', 'key_decisions', 'mentioned_people', 'mentioned_dates']
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
        console.log(`[Consolidate Gemini] Tentando modelo: ${modelName}`);
        const modelClient = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.35
          }
        });

        const apiResult = await modelClient.generateContent([systemPrompt, textPrompt]);
        responseText = apiResult.response.text();
        const usage = apiResult.response.usageMetadata;
        totalTokenCount = usage?.totalTokenCount || null;
        result = apiResult;
        selectedModel = modelName;
        break;
      } catch (err: any) {
        console.warn(`[Consolidate Gemini] Falha ao tentar modelo ${modelName}:`, err.message);
        lastError = err;
        if (err.status === 401 || err.status === 403) {
          throw err;
        }
      }
    }

    if (!result) {
      throw new Error(`Falha técnica em todos os modelos do Gemini ao consolidar. Erro mais recente: ${lastError?.message || 'Serviço Indisponível'}`);
    }

    const parsedJson = JSON.parse(responseText);
    const { summary, insights, work_items: hierarchicalWorkItems } = parsedJson;

    // 4. Create the new consolidated transcription record
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const consolidatedFileName = `Consolidado: ${dateStr} (${transcriptions.length} gravações)`;
    
    const formattedContent = `# Relatório Geral Consolidado de Gravações

**Data de Consolidação:** ${new Date().toLocaleString('pt-BR')}
**Fontes Consolidadas:**
${transcriptions.map(t => `- **${t.file_name}** (${new Date(t.transcribed_at).toLocaleDateString('pt-BR')})`).join('\n')}

---

## Detalhes das Fontes e Resumos Individuais:

${transcriptions.map((t, idx) => `### #${idx + 1} - ${t.file_name}
**Resumo Individual da IA:**
${t.ai_summary || 'Sem resumo individual.'}

**Metas e Tarefas originais associadas:**
${(t.extracted_entities as any)?.work_items?.length || 0} Metas extraídas.

**Decisões Individuais mapeadas:**
${(t.extracted_entities as any)?.key_decisions?.map((kd: string) => `- ${kd}`).join('\n') || 'Nenhuma.'}
`).join('\n\n')}
`;

    const { data: newTr, error: insertTrError } = await supabase
      .from('transcriptions')
      .insert({
        user_id: user.id,
        file_name: consolidatedFileName,
        content: formattedContent,
        transcribed_at: new Date().toISOString(),
        project_id: finalProjectId,
        ai_summary: summary,
        ai_insights: insights && Array.isArray(insights)
          ? insights.map((ins: any) => `* **[${ins.severity.toUpperCase()}] ${ins.title}**: ${ins.body}`).join('\n')
          : null,
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
      .select('id')
      .single();

    if (insertTrError) {
      throw insertTrError;
    }

    const newTranscriptionId = newTr.id;

    // 5. Insert the consolidated hierarchical work items recursively into database
    const allInsertedWorkItemIds = await insertWorkItemsRecursive(
      supabase,
      user.id,
      finalProjectId,
      newTranscriptionId,
      hierarchicalWorkItems
    );

    // 6. Insert consolidated insights into the ai_insights database
    if (insights && Array.isArray(insights) && insights.length > 0) {
      const insightsToInsert = insights.map((insight: any) => ({
        user_id: user.id,
        insight_type: insight.insight_type,
        title: insight.title,
        body: insight.body,
        severity: insight.severity || 'info',
        related_work_items: allInsertedWorkItemIds,
        related_transcriptions: [newTranscriptionId],
        dismissed: false,
        acted_on: false
      }));

      const { error: insightsError } = await supabase
        .from('ai_insights')
        .insert(insightsToInsert);

      if (insightsError) {
        console.error('[Consolidate Gemini] Failed to insert consolidated insights:', insightsError);
      }
    }

    return NextResponse.json({
      success: true,
      newTranscriptionId,
      summary,
      insights,
      work_items: hierarchicalWorkItems
    });

  } catch (err: any) {
    console.error('[Consolidate Gemini Error] Erro técnico:', err);
    return NextResponse.json({ 
      error: err.message || 'Falha técnica ao consolidar transcrições com IA.' 
    }, { status: 500 });
  }
}
