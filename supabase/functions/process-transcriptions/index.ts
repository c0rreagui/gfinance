// Supabase Edge Function: process-transcriptions
// Path: supabase/functions/process-transcriptions/index.ts
// Handles transcription analysis and batch consolidation securely using Gemini AI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { GoogleGenerativeAI, SchemaType } from "npm:@google/generative-ai@^0.24.1";
import crypto from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Embedded Static Memories from G-Work configuration files to ensure the Edge Function is self-contained
const CONTEXTO_CONTENT = `
# Perfil do Usuário - Guilherme Corrêa

Este arquivo documenta quem é o Guilherme, seu papel profissional, suas empresas, seus projetos principais, sua stack de tecnologia preferencial e suas diretrizes de qualidade inegociáveis. O G-Work Intelligence Engine utiliza este contexto para mapear e classificar tarefas de forma rápida e assertiva.

---

## Quem eu sou
* Nome: Guilherme Corrêa
* Papel: Fundador, CTO e Arquiteto de Software.
* Filosofia: Construo porque não consigo não construir. Penso em décadas, não em sprints. Eu dirijo, eu arquiteto, eu tomo as decisões técnicas cruciais.
* Padrão de Qualidade: Inegociável. Padrão de design e engenharia Stripe, Apple, Vercel e Linear. Dark-first, tipografia editorial e sensibilidade cinematográfica.

---

## Ecossistema de Projetos Ativos

### 1. G-Hub (Command Center)
O portal central unificado que serve como cockpit digital pessoal do Guilherme, hospedando os módulos abaixo e servindo como ponto único de entrada (/).

### 2. G-Finance (Módulo Financeiro)
Sistema unificado de wealth management pessoal.
* Funcionalidades: Controle patrimonial, conciliação em tempo real de saldos bancários, controle de cartões de crédito, fluxo de caixa projetado no Calendário Financeiro, investimentos, e relatórios analíticos de gastos.
* Tecnologia: Next.js 15, Tailwind CSS v4, Supabase (Postgres + triggers automáticos de saldo RLS), API Gemini 2.5 Pro (CFO Persona) e captura de SMS de transações bancárias em tempo real.

### 3. G-Work (Módulo de Produtividade)
Gerenciador tático de tarefas e inteligência de reuniões.
* Funcionalidades: Kanban interativo drag-and-drop, árvore hierárquica (padrão Azure DevOps: Épicos - Features - Stories - Tasks), processador de transcrições e áudios de reuniões integrados ao Google Drive, curadoria interativa pré-publicação com chat de IA de refinamento, e banco de memórias dinâmica/estática.
* Tecnologia: Next.js 15, React 19, @dnd-kit/core, Tailwind CSS v4, Gemini 2.5 Flash Lite/Pro.

---

## Tech Stack & Preferências Arquiteturais
Ao sugerir tarefas de código ou decisões de engenharia, respeite as preferências do Guilherme:
* Frontend: Next.js (App Router), React, TypeScript estrito, CSS puro ou Tailwind CSS (versão v4 de preferência).
* Backend & DB: Supabase, PostgreSQL estrito, Row-Level Security (RLS) obrigatório em todas as tabelas. Triggers e funções PL/pgSQL no banco de dados para garantir consistência de dados e regras de negócio críticas.
* Segurança: OWASP ASVS como guia principal. Sem secrets hardcoded, sanitização total de inputs e tipagens TypeScript robustas (zero uso de any).
* Performance: Restrição de design inicial (não fase de otimização). Carregamentos velozes e interface fluida.
`;

const PERSONA_CONTENT = `
# G-Work AI Persona

## Voz e Tom
- Direto e Pragmático: Fale como um engenheiro principal ou fundador técnico de classe mundial (referência Stripe/Linear).
- Sem Enrolação: Evite introduções longas, desculpas corporativas vazias ou linguagem excessivamente polida. Seja focado nos entregáveis e resultados.
- Tonalidade Executiva: Tom seguro, analítico e de alto nível de maturidade. Você não apenas executa, você entende e arquiteta soluções.

## Diretrizes de Resposta
- Escreva em português brasileiro conciso e editorial.
- Ao justificar escolhas, utilize razões técnicas fundamentadas, não clichês ("A gente faz assim por boas práticas").
- Valorize a simplicidade e a resiliência no design.
`;

const ALMA_CONTENT = `
# G-Work AI Alma (Core Values)

## 1. Padrão World-Class
- Inegociável em todas as camadas da aplicação (Frontend, Backend, Segurança e Banco de dados).
- Se parece um template pronto ou genérico, reprovou.
- Toda escolha técnica deve ser a melhor disponível para o contexto, e não apenas a mais comum.

## 2. Sensibilidade de Design (UI/UX)
- Inspiração em interfaces premium: Apple, Linear, Stripe, Vercel.
- Layouts dark-first, tipografia editorial de alta legibilidade, uso de glassmorphism e micro-animações.
- Nunca utilize dados de simulação (mock) ou marcadores de posição (placeholders) em produção.

## 3. Integridade e Resiliência
- A segurança (OWASP, RLS) e a performance (velocidade, latência) são restrições de design iniciais, não fases de otimização tardias.
- Código resiliente a falhas e limpo para que qualquer desenvolvedor no mundo sinta orgulho ao inspecioná-lo.
`;

const FUNCOES_CONTENT = `
# G-Work AI Funções e Fluxos

## 1. Estruturação do Kanban (Azure DevOps)
Ao ler e resumir transcrições, organize os entregáveis na seguinte hierarquia:
- Epic: Macro-iniciativas ou módulos (ex: "Integração do Pix no G-Finance").
- Feature: Grandes blocos funcionais (ex: "Visualizador de logs de webhook").
- Story: Casos de uso específicos e metas operacionais (ex: "Matching score de transações").
- Task: Tarefas concretas e atômicas de código/infra (ex: "Escrever migração SQL para profiles").

## 2. Análise Geral Consolidada
Ao receber múltiplas gravações:
- Conecte as ideias entre diferentes sessões.
- Identifique e remova redundâncias de tarefas propostas.
- Agrupe metas sob iniciativas comuns de alto valor estratégico.

## 3. Extração de Memórias (Self-improvement)
Mapeie novos fatos, regras e preferências explícitas do usuário para posterior aprovação, garantindo que o agente aprenda continuamente com as conversas.
`;

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description: "Resumo estruturado e executivo da transcrição em português brasileiro (1 a 2 parágrafos)."
    },
    key_decisions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Decisões cruciais, combinados, arquiteturas ou direcionamentos tomados no áudio."
    },
    mentioned_people: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Pessoas ou cargos citados na gravação."
    },
    mentioned_dates: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING, description: "Descrição da data/evento (ex: Entrega da API Itaú)." },
          daysFromNow: { type: SchemaType.INTEGER, description: "Número de dias a partir de hoje (hoje = 0)." }
        },
        required: ["label", "daysFromNow"]
      },
      description: "Datas importantes, prazos ou compromissos citados."
    },
    insights: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          insight_type: {
            type: SchemaType.STRING,
            description: "Tipo do insight: action_suggestion, deadline_warning, pattern_detected, priority_shift"
          },
          title: { type: SchemaType.STRING, description: "Título conciso do insight." },
          body: { type: SchemaType.STRING, description: "Descrição detalhada e contextualizada do insight." },
          severity: { type: SchemaType.STRING, description: "Gravidade: info, warning, critical" }
        },
        required: ["insight_type", "title", "body", "severity"]
      },
      description: "Insights táticos estratégicos extraídos para otimização ou tomada de decisão."
    },
    work_items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING, description: "Título claro da iniciativa (Épico)." },
          description: { type: SchemaType.STRING, description: "Descrição detalhada do Épico." },
          type: { type: SchemaType.STRING, description: "Sempre: epic" },
          priority: { type: SchemaType.STRING, description: "Prioridade: critical, high, medium, low, none" },
          daysFromNow: { type: SchemaType.INTEGER, description: "Dias recomendados para entrega final do Épico." },
          children: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING, description: "Título da Feature." },
                description: { type: SchemaType.STRING, description: "Descrição da Feature." },
                type: { type: SchemaType.STRING, description: "Sempre: feature" },
                priority: { type: SchemaType.STRING },
                daysFromNow: { type: SchemaType.INTEGER },
                children: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      title: { type: SchemaType.STRING, description: "Título da Story." },
                      description: { type: SchemaType.STRING, description: "Descrição da Story." },
                      type: { type: SchemaType.STRING, description: "Sempre: story" },
                      priority: { type: SchemaType.STRING },
                      daysFromNow: { type: SchemaType.INTEGER },
                      children: {
                        type: SchemaType.ARRAY,
                        items: {
                          type: SchemaType.OBJECT,
                          properties: {
                            title: { type: SchemaType.STRING, description: "Título da Tarefa acionável." },
                            description: { type: SchemaType.STRING, description: "Descrição da Tarefa." },
                            type: { type: SchemaType.STRING, description: "Sempre: task" },
                            priority: { type: SchemaType.STRING },
                            daysFromNow: { type: SchemaType.INTEGER }
                          },
                          required: ["title", "type", "priority"]
                        }
                      }
                    },
                    required: ["title", "type", "priority"]
                  }
                }
              },
              required: ["title", "type", "priority"]
            }
          }
        },
        required: ["title", "type", "priority"]
      },
      description: "Estrutura hierárquica de tarefas organizadas como Azure DevOps: Epic -> Feature -> Story -> Task."
    },
    extracted_memories: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Diretrizes de preferência, fatos ou regras técnicas que o Guilherme determinou nesta gravação e que devem ser gravadas na memória do agente para o futuro."
    }
  },
  required: ["summary", "work_items", "insights", "key_decisions", "mentioned_people", "mentioned_dates", "extracted_memories"]
};

// Initialize Gemini Client
const apiKey = Deno.env.get("GEMINI_API_KEY");
const DEFAULT_MODEL = "gemini-2.5-flash-lite";

function getGeminiClient(): GoogleGenerativeAI {
  if (!apiKey || apiKey === "your-gemini-key-here") {
    throw new Error("GEMINI_API_KEY não configurada no Supabase.");
  }
  return new GoogleGenerativeAI(apiKey);
}

serve(async (req: Request) => {
  // Handle CORS Preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado. Token JWT ausente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Connect to Supabase using user's context (guarantees RLS compliance)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Retrieve and verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json();
    const { action } = body;

    // Fetch active dynamic memories from database
    const { data: dbMemories, error: memoriesError } = await supabase
      .from("agent_memories")
      .select("content")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const activeMemoriesText = dbMemories && dbMemories.length > 0
      ? dbMemories.map((m: any, idx: number) => `${idx + 1}. ${m.content}`).join("\n")
      : "Nenhuma diretriz de memória ativa no momento.";

    const genAI = getGeminiClient();

    if (action === "generate") {
      const { transcriptionId } = body;
      if (!transcriptionId) {
        return new Response(JSON.stringify({ error: "ID de transcrição não fornecido." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch transcription from database
      const { data: transcription, error: fetchError } = await supabase
        .from("transcriptions")
        .select("*")
        .eq("id", transcriptionId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !transcription) {
        return new Response(JSON.stringify({ error: "Transcrição não encontrada ou sem acesso." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate file hash
      const fileHash = crypto
        .createHash("sha256")
        .update(transcription.content)
        .digest("hex");

      const systemPrompt = `
        Você é o G-Work Intelligence Engine, a mente analítica tática de inteligência do Guilherme, fundador & CTO.
        
        Sua identidade, princípios e regras de execução estão definidos nas seções a seguir.
        
        ---
        ## CONTEXTO DO USUÁRIO (QUEM É O GUILHERME E NO QUE TRABALHA)
        ${CONTEXTO_CONTENT}
        
        ---
        ## PERSONA (COMO VOCÊ SE COMPORTA E FALA)
        ${PERSONA_CONTENT}
        
        ---
        ## ALMA (DIRETRIZES DE QUALIDADE DO PROJETO)
        ${ALMA_CONTENT}
        
        ---
        ## FUNÇÕES E FLUXOS (COMO ESTRUTURAR TAREFAS)
        ${FUNCOES_CONTENT}
        
        ---
        ## DIRETRIZES DE VELOCIDADE, CONCISÃO E COMPLEXIDADE (CRÍTICO - EXECUÇÃO SOB LIMITAÇÃO DE TEMPO)
        Para evitar falhas de timeout e manter respostas focadas, você DEVE ser extremamente enxuto, direto e conciso na geração dos nós de tarefas. Siga rigorosamente estes limites estruturais máximos:
        - Limite o plano de tarefas a no máximo 2 Épicos (iniciativas estratégicas).
        - Cada Épico deve conter no máximo 2 Features importantes.
        - Cada Feature deve conter no máximo 3 Tasks acionáveis e de foco técnico.
        - Escreva descrições curtas e pragmáticas (máximo de 1 período curto por tarefa). Sem prolixidade.
        - Concentre-se apenas nos reais direcionamentos estratégicos do áudio.
        
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

      let result = null;
      let selectedModel = "";
      let totalTokenCount = null;
      let responseText = "";
      const modelsToTry = [
        DEFAULT_MODEL,
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-flash-latest"
      ];
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Deno Edge Function] Tentando modelo: ${modelName}`);
          const modelClient = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              temperature: 0.3
            }
          });

          const apiResult = await modelClient.generateContent([systemPrompt, textPrompt]);
          responseText = apiResult.response.text();
          const usage = apiResult.response.usageMetadata;
          totalTokenCount = usage?.totalTokenCount || null;
          result = apiResult;
          selectedModel = modelName;
          break; // Sucesso!
        } catch (err: any) {
          console.warn(`[Deno Edge Function] Falha ao tentar modelo ${modelName}:`, err.message);
          lastError = err;
        }
      }

      if (!result) {
        throw new Error(`Falha técnica em todos os modelos do Gemini. Erro mais recente: ${lastError?.message || "Serviço Indisponível"}`);
      }

      const parsedJson = JSON.parse(responseText);
      const { summary, insights, work_items: hierarchicalWorkItems } = parsedJson;

      const formattedInsightsText = insights && Array.isArray(insights)
        ? insights.map((ins: any) => `* **[${ins.severity.toUpperCase()}] ${ins.title}**: ${ins.body}`).join("\n")
        : null;

      // Update the transcription record as Draft (processed_at = null)
      const { error: updateError } = await supabase
        .from("transcriptions")
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
          processed_at: null,
          gemini_model: selectedModel,
          token_count: totalTokenCount
        })
        .eq("id", transcriptionId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("[Deno Edge Function] Falha ao atualizar transcrição:", updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          summary,
          insights,
          work_items: hierarchicalWorkItems,
          extracted_memories: parsedJson.extracted_memories || []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "consolidate") {
      const { transcriptionIds } = body;
      if (!transcriptionIds || !Array.isArray(transcriptionIds) || transcriptionIds.length < 2) {
        return new Response(JSON.stringify({ error: "IDs de transcrição insuficientes para consolidação." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch source transcriptions
      const { data: transcriptions, error: fetchError } = await supabase
        .from("transcriptions")
        .select("*")
        .in("id", transcriptionIds)
        .eq("user_id", user.id);

      if (fetchError || !transcriptions || transcriptions.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhuma transcrição encontrada ou sem acesso." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sortedIds = [...transcriptionIds].sort();
      const fileHash = crypto
        .createHash("sha256")
        .update(`consolidated-${sortedIds.join("-")}`)
        .digest("hex");

      const combinedContent = transcriptions.map((tr, index) => {
        return `Gravação #${index + 1}:
Título do Arquivo: ${tr.file_name}
Data da Transcrição: ${new Date(tr.transcribed_at).toLocaleDateString("pt-BR")}
Projeto: ${tr.project_id || "Nenhum"}

Resumo Individual da IA:
${tr.ai_summary || "Sem resumo individual gerado."}

Conteúdo Transcrito Bruto (Trecho):
${tr.content.substring(0, 2500)}${tr.content.length > 2500 ? "..." : ""}
`;
      }).join("\n\n---\n\n");

      const projectIds = transcriptions.map(t => t.project_id).filter(Boolean);
      const uniqueProjectIds = Array.from(new Set(projectIds));
      const finalProjectId = uniqueProjectIds.length === 1 ? uniqueProjectIds[0] : null;

      const systemPrompt = `
        Você é o G-Work Consolidation Engine, a mente analítica estratégica de inteligência do Guilherme, fundador & CTO.
        
        Sua identidade, princípios e regras de execução estão definidos nas seções a seguir.
        
        ---
        ## CONTEXTO DO USUÁRIO (QUEM É O GUILHERME E NO QUE TRABALHA)
        ${CONTEXTO_CONTENT}
        
        ---
        ## PERSONA (COMO VOCÊ SE COMPORTA E FALA)
        ${PERSONA_CONTENT}
        
        ---
        ## ALMA (DIRETRIZES DE QUALIDADE DO PROJETO)
        ${ALMA_CONTENT}
        
        ---
        ## FUNÇÕES E FLUXOS (COMO ESTRUTURAR TAREFAS)
        ${FUNCOES_CONTENT}
        
        ---
        ## DIRETRIZES DE VELOCIDADE, CONCISÃO E COMPLEXIDADE (CRÍTICO - EXECUÇÃO SOB LIMITAÇÃO DE TEMPO)
        Para evitar falhas de timeout e manter foco estratégico, você DEVE ser extremamente enxuto, direto e conciso na consolidação das tarefas. Remova duplicidades agressivamente e siga rigorosamente estes limites estruturais máximos:
        - Limite o plano de tarefas consolidado a no máximo 2-3 Épicos (iniciativas estratégicas gerais).
        - Cada Épico deve conter no máximo 1-2 Features importantes.
        - Cada Feature deve conter no máximo 3 Tasks essenciais.
        - Escreva descrições curtas e pragmáticas (máximo de 1 período curto por tarefa).
        
        ---
        ## DIRETRIZES DE MEMÓRIA APRENDIDAS (INSTRUÇÕES DO GUILHERME)
        Estas são regras, preferências ou fatos específicos aprendidos nas reuniões anteriores que você DEVE respeitar:
        ${activeMemoriesText}
        
        ---
        Mapeie as metas, prazos e decisões consolidados sem redundâncias.
        Além de tudo isso, extraia NOVAS diretrizes de memória consolidadas se houver novas preferências, regras unificadas de arquitetura, decisões importantes de design ou fatos novos aprendidos nestas gravações. Retorne-as no campo "extracted_memories" (apenas novas regras consolidadas relevantes para o futuro, sem repetir as já aprendidas).
      `;

      const textPrompt = `
        Fontes de Transcrições a Consolidar:
        ${combinedContent}
      `;

      let result = null;
      let selectedModel = "";
      let totalTokenCount = null;
      let responseText = "";
      const modelsToTry = [
        DEFAULT_MODEL,
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-flash-latest"
      ];
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[Deno Edge Function - Consolidate] Tentando modelo: ${modelName}`);
          const modelClient = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
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
          console.warn(`[Deno Edge Function - Consolidate] Falha ao tentar modelo ${modelName}:`, err.message);
          lastError = err;
        }
      }

      if (!result) {
        throw new Error(`Falha técnica em todos os modelos do Gemini ao consolidar. Erro mais recente: ${lastError?.message || "Serviço Indisponível"}`);
      }

      const parsedJson = JSON.parse(responseText);
      const { summary, insights, work_items: hierarchicalWorkItems } = parsedJson;

      const dateStr = new Date().toLocaleDateString("pt-BR");
      const consolidatedFileName = `Consolidado: ${dateStr} (${transcriptions.length} gravações)`;
      
      const formattedContent = `# Relatório Geral Consolidado de Gravações

**Data de Consolidação:** ${new Date().toLocaleString("pt-BR")}
**Fontes Consolidadas:**
${transcriptions.map(t => `- **${t.file_name}** (${new Date(t.transcribed_at).toLocaleDateString("pt-BR")})`).join("\n")}

---

## Detalhes das Fontes e Resumos Individuais:

${transcriptions.map((t, idx) => `### #${idx + 1} - ${t.file_name}
**Resumo Individual da IA:**
${t.ai_summary || "Sem resumo individual."}

**Metas e Tarefas originais associadas:**
${(t.extracted_entities as any)?.work_items?.length || 0} Metas extraídas.

**Decisões Individuais mapeadas:**
${(t.extracted_entities as any)?.key_decisions?.map((kd: string) => `- ${kd}`).join("\n") || "Nenhuma."}
`).join("\n\n")}
`;

      const { data: newTr, error: insertTrError } = await supabase
        .from("transcriptions")
        .insert({
          user_id: user.id,
          file_name: consolidatedFileName,
          content: formattedContent,
          transcribed_at: new Date().toISOString(),
          project_id: finalProjectId,
          ai_summary: summary,
          ai_insights: insights && Array.isArray(insights)
            ? insights.map((ins: any) => `* **[${ins.severity.toUpperCase()}] ${ins.title}**: ${ins.body}`).join("\n")
            : null,
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
          processed_at: null,
          gemini_model: selectedModel,
          token_count: totalTokenCount
        })
        .select("id")
        .single();

      if (insertTrError) {
        throw insertTrError;
      }

      // Mark the original source transcriptions as processed
      const { error: updateSourcesError } = await supabase
        .from("transcriptions")
        .update({ processed_at: new Date().toISOString() })
        .in("id", transcriptionIds)
        .eq("user_id", user.id);

      if (updateSourcesError) {
        console.error("[Deno Edge Function - Consolidate] Error marking source transcriptions as processed:", updateSourcesError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          newTranscriptionId: newTr.id,
          summary,
          insights,
          work_items: hierarchicalWorkItems
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(JSON.stringify({ error: `Ação inválida ou não reconhecida: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (err: any) {
    console.error("[Deno Edge Function Error] Erro geral de processamento:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno de processamento." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
