---
tags: [benchmark, market-research, product-intel, g-work]
feature_name: "G-Work — Autonomous Work Intelligence Dashboard"
date_created: 2026-06-09
author: "Antigravity Competitive Intel Agent"
aesthetic_level: "Premium Dark-first, Glassmorphism, Editorial Typography"
unfair_advantage: "Gemini-powered transcription memory that autonomously generates work structure (Epics→Tasks) from .md files — zero cognitive load, zero manual input. The AI thinks, the user supervises."
---

# G-Work — Benchmark de Inteligência Competitiva

> **Hipótese de Valor:** Profissionais e fundadores perdem horas organizando trabalho manualmente. Ferramentas existentes exigem input constante, criam fadiga cognitiva, e transformam "produtividade" em mais trabalho. O G-Work elimina isso: ele ingere transcrições `.md` do Drive, constrói memória contextual persistente, e entrega um dashboard autônomo que **pensa pelo usuário** — gerando Epics, Features, User Stories e Tasks automaticamente via Gemini, organizados em Kanban com hierarquia estilo Azure DevOps.

---

## FASE 1 — Escopo e Contexto

| Dimensão | Definição |
|:---|:---|
| **Nome** | G-Work — Autonomous Work Intelligence Dashboard |
| **Problema Central** | O usuário gasta esforço cognitivo organizando trabalho em vez de executando. Transcrições e notas acumulam sem gerar ação. |
| **Solução** | Engine Gemini que lê `.md` transcriptions, extrai contexto, gera hierarquia de work items (Epic → Feature → Story → Task), organiza em Kanban, e sugere próximos passos autonomamente. |
| **Stack** | Next.js 16 App Router, React 19, Tailwind CSS v4, Ant Design, Supabase (RLS), Gemini AI SDK |
| **Padrão Estético** | Dark-first, Glassmorphism imersivo, tipografia editorial, sensibilidade Linear/Raycast |

---

## FASE 2 — Mapeamento de Concorrentes

### 2.1 Players Tradicionais (Incumbentes)

| Player | O que faz | Onde falha |
|:---|:---|:---|
| **Azure DevOps** | Boards com hierarquia Epic→Feature→Story→Task, Kanban, Sprints, Repos | UI datada e lenta (segundos de loading), UX inconsistente, curva de aprendizado brutal, zero inteligência autônoma. Botões que não fazem o esperado. Terminologia confusa. Microsoft despriorizou em favor do GitHub. |
| **Jira** | Padrão enterprise para Agile/Scrum, boards, backlog, roadmaps | Complexidade extrema para uso pessoal. Setup de projetos demora horas. Performance degradada com volume. Design de 2015. Zero AI autônoma nativa. |
| **Asana** | Task management com timelines, boards, portfolios | Light-mode centric, design genérico, AI limitada a sugestões superficiais. Não ingere dados externos automaticamente. |

### 2.2 Fintechs e SaaS Modernos

| Player | O que faz | Onde falha |
|:---|:---|:---|
| **Linear** | Issue tracking com UX world-class, sub-100ms, keyboard-first | Hierarquia limitada (Project→Issue→Sub-issue). Não tem Epic→Feature→Story. Focado 100% em engenharia, não serve como "Work OS" pessoal. Não ingere transcrições. |
| **Notion + AI Agents** | Knowledge base + Workers autônomos que executam tarefas em databases | Agents falham na "last mile" — prometem autonomia mas exigem supervisão constante. Pricing de créditos imprevisível. Performance degrada em workspaces grandes. AI é "lazy" segundo Reddit — diz que vai fazer mas não executa. |
| **ClickUp** | "Work OS" com Kanban, Docs, AI Brain, hierarquia flexível | Feature bloat extremo. Interface cluttered. "Mais ferramenta que produtividade". Learning curve rivaliza com Jira. Dark mode existe mas design é template-like. |
| **Monday.com** | Visual boards, automations, Monday Dev para produto | Bonito visualmente mas AI é superficial. Kanban básico. Hierarquia limitada. Custo alto para features AI. |

### 2.3 AI-First / Agentes Autônomos

| Player | O que faz | Onde falha |
|:---|:---|:---|
| **Lindy.ai** | Assistente AI pessoal via iMessage/SMS. Triagem de inbox, meeting prep, calendar | Generalista demais. Pricing de créditos imprevisível. Não tem Kanban nem hierarquia de work items. É um "assistente textual", não um dashboard visual de trabalho. |
| **Granola** | AI notepad que captura audio local (sem bot) e limpa notas pós-meeting | Apenas notas de meeting. Não gera tasks, não organiza em Kanban, não tem hierarquia. É um step acima de Google Docs, não um work OS. |
| **Read AI** | Knowledge graph cross-channel (meetings + emails + Slack) | Dashboards genéricos. Não tem Kanban. Não gera work items estruturados. Funciona como "pesquisa" sobre reuniões, não como esteira de trabalho. |
| **Taskade** | Converte meeting transcripts em projetos/tasks com AI agents | AI gera tasks mas qualidade é inconsistente. Design template-like. Hierarquia existe mas é visual, não semântica. Não tem a profundidade de um Azure DevOps. |
| **Mem.ai** | AI-first notes — capture & forget, AI organiza e busca | Zero organização de trabalho. Sem Kanban, sem hierarquia. É "Second Brain" puro — ótimo para notas, inútil para gestão de trabalho. |
| **Reclaim.ai / Motion** | AI scheduling — protege tempo, agenda tasks automaticamente | Sem Kanban. Sem hierarquia de work items. Sem ingestão de transcrições. São ferramentas de calendário com AI, não de gestão de trabalho. |

### 2.4 Modelos Alternativos / Poli-ferramental

| Modelo | O que fazem | Onde falha |
|:---|:---|:---|
| **Obsidian + Dataview + Templates** | Vault local com queries, kanban plugin, daily notes | 100% manual. Exige horas de setup e manutenção. Sem AI nativa. Sem hierarquia formal. Para power users técnicos apenas. |
| **Planilhas + Google Docs** | Tracking manual em spreadsheets | Zero inteligência. Puro trabalho braçal. Design inexistente. |
| **Zapier/n8n + Notion** | Automações que conectam transcrições ao Notion | Frágil. Quebra silenciosamente. Exige manutenção constante. Não tem inteligência semântica — são pipes burros. |

---

## FASE 3 — Mineração de Fóruns & Social Listening

### Citações Reais de Usuários (Reddit, HN, Fóruns)

> **Quote 1 (Reddit, r/productivity):** *"I'm drowning in unorganized action items. Every AI tool I've tried just adds MORE information rather than reducing the number of decisions I need to make."*
> — Frustrações com tools que acumulam em vez de filtrar.

> **Quote 2 (Reddit, r/Notion):** *"The agent says 'I'll take care of that' but then fails to actually execute the change across databases. It's basically lazy — I still end up doing the work myself anyway."*
> — Notion AI Agents prometem autonomia mas não entregam.

> **Quote 3 (Reddit, r/azure):** *"The back button closing a work item instead of navigating back? The horrendous text boxes? Azure DevOps feels like it's maintained by a skeleton crew."*
> — UI/UX do Azure DevOps é universalmente criticada.

> **Quote 4 (Reddit, r/productivity):** *"Most tools are 'transcript generators' rather than intelligent memory systems. They store everything with equal weight, making it impossible to differentiate a critical decision from a casual comment."*
> — Ferramentas de transcrição não distinguem sinal de ruído.

> **Quote 5 (Reddit, r/SaaS):** *"Technology should filter information, not just store it. The most successful workflows involve AI for deep, searchable context rather than generic summaries."*
> — O mercado clama por inteligência que filtra, não que acumula.

### Padrões Identificados

| Padrão | Frequência | Impacto |
|:---|:---|:---|
| **"Post-meeting chore"** — AI gera transcrição mas usuário ainda precisa limpar/mover/organizar | Altíssima | Anula o benefício da transcrição |
| **"Contextual fatigue"** — tudo armazenado com peso igual, sem priorização | Alta | Decision fatigue crescente |
| **"Still have to"** — agents prometem autonomia mas exigem supervisão constante | Alta | Desconfiança com marketing de "AI autônoma" |
| **"Tool chaos"** — informação fragmentada entre 5+ ferramentas | Alta | Tempo perdido em context-switching |
| **"Aesthetic mediocrity"** — dashboards com design de 2015, grids cinzas, light-mode forçado | Média-Alta | Recusa emocional de engajar com a ferramenta |

---

## FASE 4 — Jobs-To-Be-Done (JTBD) & Friction Points

### JTBD Primários

1. > *"Quando eu **termino um dia de reuniões e chamadas**, eu quero **que minha esteira de trabalho já esteja organizada automaticamente**, para que eu possa **começar o próximo dia executando em vez de organizando**."*

2. > *"Quando eu **gravo ou transcrevo uma conversa de trabalho**, eu quero **que as decisões, tasks e dependências sejam extraídas sem meu input**, para que eu possa **confiar que nada foi esquecido sem gastar esforço cognitivo revisando**."*

3. > *"Quando eu **abro meu dashboard de trabalho**, eu quero **ver imediatamente o que é mais importante hoje, com contexto do que aconteceu antes**, para que eu possa **tomar ação em segundos, não em minutos de leitura**."*

4. > *"Quando eu **preciso organizar trabalho em Epics, Features e Tasks**, eu quero **que a AI sugira a estrutura hierárquica baseada no contexto das transcrições**, para que eu possa **apenas aprovar ou ajustar em vez de construir do zero**."*

5. > *"Quando eu **quero ver o progresso geral do meu trabalho**, eu quero **um Kanban visual premium que me dê controle fino**, para que eu possa **arrastar, priorizar e reorganizar com fluidez cinematográfica**."*

### Friction Points das Alternativas

| Tipo de Fricção | Azure DevOps | Linear | Notion | Lindy/Granola |
|:---|:---|:---|:---|:---|
| **Onboarding** | Setup de org/project/team leva horas | Rápido, mas sem hierarquia profunda | Rápido, mas AI agents precisam config manual | Simples, mas sem estrutura de trabalho |
| **Interface** | Lenta, inconsistente, datada | Excelente, mas limitada a eng | Cluttered em workspaces grandes | Sem interface visual de gestão |
| **Automação** | Pipelines CI/CD, não work management | Triage AI para issues | Agents inconsistentes ("lazy") | Boa para email/calendar, não para work items |
| **Ingestão de Dados** | Manual — criar work items um a um | Manual — criar issues | Manual ou via automações frágeis | Automática para meetings, mas não para .md files |
| **Hierarquia** | ✅ Epic→Feature→Story→Task (nativa) | ❌ Flat (Project→Issue) | ❌ Database genérica, precisa modelar | ❌ Inexistente |

---

## FASE 5 — Matriz de Comparação Funcional & Gap Analysis

| Feature / Dimensão | Azure DevOps (Incumbente) | Linear (Best-in-class Dev) | Notion + AI (Knowledge Hub) | Lindy.ai (AI Agent) | **G-Work (Nossa Proposta)** |
|:---|:---|:---|:---|:---|:---|
| **Aesthetic & Craft** | Obsoleto, light-centric, grids MS de 2015 | World-class, dark, minimal, keyboard-first | Limpo mas template-like quando customizado | SaaS genérico, dashboard básico | **World-class Dark-first, Glassmorphism, Editorial Typography, Linear-inspired data density** |
| **Hierarquia de Work Items** | ✅ Epic→Feature→Story→Task (melhor do mercado) | ❌ Project→Issue→Sub-issue (flat) | ❌ Databases genéricas (precisa modelar) | ❌ Inexistente | **✅ Epic→Feature→Story→Task (inspirado em ADO, com UX de Linear)** |
| **Kanban Board** | ✅ Funcional mas lento e feio | ✅ Bonito, rápido, mas sem hierarquia | ✅ Board view genérica | ❌ Sem board | **✅ Kanban premium com drag-and-drop fluido, micro-animações, filtros por hierarquia** |
| **Ingestão Autônoma de Transcrições** | ❌ 100% manual | ❌ 100% manual | ⚠️ Via automações frágeis (Zapier/Make) | ⚠️ Apenas meetings ao vivo | **✅ Gemini ingere .md files do Drive automaticamente, extrai contexto, gera work items** |
| **AI Autônoma (Agent-First)** | ❌ Zero inteligência | ⚠️ Triage básica, spec writing | ⚠️ Agents prometem mas falham na execução | ✅ Proativa, mas sem gestão visual | **✅ Gemini analisa transcrições, sugere prioridades, gera hierarquia, recomenda ações** |
| **Memória Persistente** | ❌ Sem contexto cross-sessão | ❌ Sem memória AI | ⚠️ Knowledge base estática | ✅ Cross-context memory | **✅ Memória neural construída a partir de todas as transcrições — contexto acumulativo** |
| **Zero Cognitive Load** | ❌ Exige setup extenso e manutenção | ⚠️ Rápido mas ainda manual | ❌ "Notion trap" — mais tempo organizando que produzindo | ⚠️ Bom para email/calendar, ruim para work structure | **✅ Dashboard abre pronto. AI já analisou, priorizou e estruturou. Usuário só supervisiona.** |
| **Performance (Latency)** | ❌ Segundos de loading, lag constante | ✅ Sub-100ms | ⚠️ Degrada com volume | ✅ Rápido (API-based) | **✅ Sub-100ms, Shimmer/Skeleton premium, Server Components** |
| **Privacidade / RLS** | ✅ Enterprise-grade (mas overengineered) | ✅ SOC 2 | ⚠️ Créditos de AI vão para servers externos | ⚠️ Dados em cloud terceira | **✅ RLS estrito no Supabase — dados blindados por user_id, .md files processados server-side** |
| **Preço** | $$$ (enterprise licensing) | $$ (per-seat) | $$ (créditos imprevisíveis) | $$ (créditos por uso) | **$0 (self-hosted, Gemini API pay-per-use)** |

### 🎯 Gap de Mercado Identificado

> **Nenhuma ferramenta no mercado combina:**
> 1. Ingestão autônoma de transcrições `.md`
> 2. Geração automática de hierarquia Azure DevOps (Epic→Feature→Story→Task)
> 3. Kanban visual premium com estética Linear-level
> 4. AI que analisa, prioriza e sugere sem input manual
> 5. Dashboard que elimina esforço cognitivo em vez de criar mais
>
> **Esse é o espaço que o G-Work ocupa sozinho.**

---

## FASE 6 — Curva de Valor & Oceano Azul (Framework ERRC)

### ELIMINAR
- ❌ **Setup burocrático de organization/project/team** (Azure DevOps exige 30+ min de config)
- ❌ **Formulários de criação de work items com 20+ campos** (forçar o usuário a preencher título, descrição, acceptance criteria, story points, etc.)
- ❌ **Dashboards de 2015** — grids cinzas, light-mode forçado, botões inconsistentes
- ❌ **Dependência de integrações frágeis** (Zapier/Make quebrando silenciosamente)
- ❌ **"Productivity theater"** — features que parecem úteis mas só adicionam mais trabalho

### REDUZIR
- ⬇️ **Input manual para criação de tasks** — de 100% manual para ~10% (apenas aprovação/ajuste fino)
- ⬇️ **Número de ferramentas necessárias** — de 5+ (Notion + Jira + Granola + Calendar + Sheets) para 1
- ⬇️ **Tempo de onboarding** — de horas (ADO/Jira) para segundos (conectar pasta do Drive)
- ⬇️ **Complexidade de configuração de hierarquia** — de setup manual de boards/sprints/backlogs para geração automática via AI

### ELEVAR
- ⬆️ **Estética visual** — de template SaaS para nível Linear/Raycast/Stripe (dark-first, glassmorphism, editorial type)
- ⬆️ **Performance** — de segundos de loading (ADO) para sub-100ms com skeleton premium
- ⬆️ **Qualidade da AI** — de "chatbot colado" para agente autônomo com memória persistente e capacidade de gerar estruturas hierárquicas
- ⬆️ **Data density** — dashboards que respondem "o que devo fazer agora?" em um glance, sem scroll infinito

### CRIAR
- 🆕 **Transcription Memory Engine** — Gemini ingere `.md` files do Drive, constrói grafo de conhecimento contextual, e mantém memória cumulativa de todas as discussões, decisões e compromissos
- 🆕 **Auto-Hierarchy Generator** — AI gera automaticamente Epic→Feature→Story→Task a partir do contexto das transcrições, com sugestões de prioridade, datas e dependências
- 🆕 **"Zero Thought" Dashboard** — abra e veja: o que importa hoje, o que a AI descobriu, quais tasks surgiram das últimas transcrições. Sem formulários, sem cliques, sem esforço
- 🆕 **Supervisory Kanban** — Kanban onde o usuário supervisiona e ajusta em vez de construir do zero. AI preenche, usuário arrasta e aprova.
- 🆕 **Contextual Insights Feed** — feed de insights gerados pela AI a partir das transcrições ("Você mencionou X em 3 reuniões mas ainda não criou uma task", "O deadline de Y é em 5 dias e não há progress")

---

## FASE 7 — Recomendações de Craft (Premium Standard)

### 7.1 Diretrizes de Interface (UI/UX)

#### Design Tokens (OKLch)
```css
/* === G-WORK DESIGN TOKENS === */
:root {
  /* Surface Hierarchy */
  --surface-base: oklch(0.13 0.005 260);      /* Deep charcoal base */
  --surface-raised: oklch(0.16 0.008 260);     /* Cards, panels */
  --surface-overlay: oklch(0.19 0.010 260);    /* Modals, dropdowns */
  --surface-glass: oklch(0.18 0.008 260 / 0.7); /* Glassmorphism panels */
  
  /* Text Hierarchy */
  --text-primary: oklch(0.95 0.005 260);       /* Headings, primary content */
  --text-secondary: oklch(0.70 0.010 260);     /* Descriptions, metadata */
  --text-muted: oklch(0.50 0.008 260);         /* Timestamps, disabled */
  
  /* Accent — Intelligent Purple (AI actions) */
  --accent-primary: oklch(0.65 0.25 290);      /* Primary CTA, AI indicators */
  --accent-glow: oklch(0.65 0.25 290 / 0.15);  /* Soft glow behind AI elements */
  
  /* Status Colors (Work Item States) */
  --status-backlog: oklch(0.55 0.05 260);      /* Neutral gray — not started */
  --status-todo: oklch(0.70 0.15 220);         /* Cool blue — queued */
  --status-progress: oklch(0.75 0.20 85);      /* Warm amber — in progress */
  --status-review: oklch(0.70 0.18 310);       /* Soft purple — in review */
  --status-done: oklch(0.72 0.22 155);         /* Fresh green — completed */
  
  /* Hierarchy Colors (Work Item Types) */
  --type-epic: oklch(0.65 0.20 25);            /* Deep coral/red — strategic */
  --type-feature: oklch(0.68 0.22 290);        /* Rich purple — capability */
  --type-story: oklch(0.70 0.18 220);          /* Blue — user-facing */
  --type-task: oklch(0.72 0.15 155);           /* Green — executable unit */
  
  /* Glassmorphism */
  --glass-blur: 20px;
  --glass-border: oklch(1 0 0 / 0.08);
  --glass-shadow: 0 8px 32px oklch(0 0 0 / 0.3);
  
  /* Typography */
  --font-display: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Motion */
  --ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
}
```

#### Hierarquia Visual dos Work Items
```
┌─────────────────────────────────────────────────────────────┐
│ 🔴 EPIC — "Lançar MVP do G-Work"                           │
│   Barra lateral coral, badge grande, tipografia display     │
│                                                             │
│   ├── 🟣 FEATURE — "Dashboard de Insights"                 │
│   │   Barra lateral purple, badge médio                     │
│   │                                                         │
│   │   ├── 🔵 STORY — "Ver insights do dia na home"         │
│   │   │   Barra lateral blue, badge pequeno                 │
│   │   │                                                     │
│   │   │   ├── 🟢 TASK — "Implementar feed de insights"     │
│   │   │   └── 🟢 TASK — "Criar skeleton de loading"        │
│   │   │                                                     │
│   │   └── 🔵 STORY — "Filtrar insights por período"        │
│   │                                                         │
│   └── 🟣 FEATURE — "Kanban Board"                          │
│       └── ...                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Tratamento de Estados
- **Loading:** Skeleton shimmer customizado com gradiente mesh animado (não loader genérico)
- **Empty State:** Ilustração editorial + CTA claro ("Conecte sua pasta do Drive para começar")
- **Error State:** Glass card com status vermelho suave, mensagem clara, ação de retry
- **AI Thinking:** Pulsação sutil do accent-primary, texto "Gemini está analisando suas transcrições..." com progress contextual

#### Interações Emocionais
- **Kanban drag:** `duration-normal` (250ms), spring physics, ghost card com glassmorphism
- **Card expand:** Scale + fade, 200ms, ease-smooth
- **AI insight appear:** Slide-up + fade, 300ms, com glow sutil no accent
- **Hierarchy collapse/expand:** Smooth height transition, 200ms, chevron rotation
- **Status change:** Color morph suave, micro-celebration quando "Done" (confetti sutil)

### 7.2 Diretrizes de Engenharia

#### Schema de Banco (Supabase)
```sql
-- ========================================
-- G-WORK CORE TABLES
-- ========================================

-- Work Item Types Enum
CREATE TYPE work_item_type AS ENUM ('epic', 'feature', 'story', 'task');
CREATE TYPE work_item_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled');
CREATE TYPE work_item_priority AS ENUM ('critical', 'high', 'medium', 'low', 'none');

-- Work Items (Hierarquia ADO-style com adjacency list)
CREATE TABLE work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
  
  -- Core fields
  type work_item_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status work_item_status NOT NULL DEFAULT 'backlog',
  priority work_item_priority NOT NULL DEFAULT 'none',
  
  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,
  kanban_column TEXT, -- for custom board columns
  
  -- AI-generated metadata
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ai_confidence REAL, -- 0.0 to 1.0 — how confident the AI was
  source_transcription_id UUID REFERENCES transcriptions(id),
  
  -- Dates
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_work_items_user ON work_items(user_id);
CREATE INDEX idx_work_items_parent ON work_items(parent_id);
CREATE INDEX idx_work_items_type_status ON work_items(user_id, type, status);
CREATE INDEX idx_work_items_sort ON work_items(user_id, parent_id, sort_order);

-- RLS Policies (STRICT)
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own work items"
  ON work_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own work items"
  ON work_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own work items"
  ON work_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own work items"
  ON work_items FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- TRANSCRIPTIONS (Memory Engine)
-- ========================================
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Source
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL, -- SHA-256 for deduplication
  
  -- Content
  raw_content TEXT NOT NULL,
  processed_summary TEXT, -- AI-generated summary
  extracted_entities JSONB, -- people, dates, decisions, action items
  
  -- AI Processing
  processed_at TIMESTAMPTZ,
  gemini_model TEXT, -- which model processed this
  token_count INTEGER,
  
  -- Metadata
  source_date TIMESTAMPTZ, -- date of the original meeting/recording
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_file_per_user UNIQUE (user_id, file_hash)
);

CREATE INDEX idx_transcriptions_user ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_hash ON transcriptions(user_id, file_hash);
CREATE INDEX idx_transcriptions_date ON transcriptions(user_id, source_date DESC);

ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own transcriptions"
  ON transcriptions FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- AI INSIGHTS (Feed de recomendações)
-- ========================================
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  insight_type TEXT NOT NULL, -- 'action_suggestion', 'deadline_warning', 'pattern_detected', 'priority_shift'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  
  -- References
  related_work_items UUID[], -- array of work_item IDs
  related_transcriptions UUID[], -- array of transcription IDs
  
  -- State
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  acted_on BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insights_user_active ON ai_insights(user_id) 
  WHERE dismissed = FALSE AND acted_on = FALSE;

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own insights"
  ON ai_insights FOR ALL USING (auth.uid() = user_id);
```

#### Zod Schemas (Validação)
```typescript
import { z } from 'zod';

export const WorkItemTypeSchema = z.enum(['epic', 'feature', 'story', 'task']);
export const WorkItemStatusSchema = z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']);
export const WorkItemPrioritySchema = z.enum(['critical', 'high', 'medium', 'low', 'none']);

export const CreateWorkItemSchema = z.object({
  type: WorkItemTypeSchema,
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  parent_id: z.string().uuid().optional(),
  status: WorkItemStatusSchema.default('backlog'),
  priority: WorkItemPrioritySchema.default('none'),
  due_date: z.string().datetime().optional(),
  ai_generated: z.boolean().default(false),
  ai_confidence: z.number().min(0).max(1).optional(),
  source_transcription_id: z.string().uuid().optional(),
});

export const GeminiExtractionSchema = z.object({
  work_items: z.array(z.object({
    type: WorkItemTypeSchema,
    title: z.string(),
    description: z.string().optional(),
    priority: WorkItemPrioritySchema,
    children: z.lazy(() => z.array(GeminiWorkItemSchema)).optional(),
  })),
  insights: z.array(z.object({
    type: z.enum(['action_suggestion', 'deadline_warning', 'pattern_detected', 'priority_shift']),
    title: z.string(),
    body: z.string(),
    severity: z.enum(['info', 'warning', 'critical']),
  })),
  summary: z.string(),
  key_decisions: z.array(z.string()),
  mentioned_people: z.array(z.string()),
  mentioned_dates: z.array(z.object({
    date: z.string(),
    context: z.string(),
  })),
});
```

#### Design de Agente (Gemini)
```typescript
// Sliding Window para controle de custo
const TRANSCRIPTION_PROCESSING_CONFIG = {
  model: 'gemini-2.5-flash', // Cost-effective for bulk processing
  maxInputTokens: 128_000,   // Flash context window
  maxOutputTokens: 8_192,
  temperature: 0.3,          // Low creativity — we want precision
  
  // Sliding window: processar no máximo 10 transcrições por batch
  batchSize: 10,
  
  // System prompt template
  systemPrompt: `You are the G-Work Intelligence Engine. Your role is to analyze 
work transcriptions and extract structured work items following Azure DevOps hierarchy:

- EPIC: Strategic initiative or large body of work (e.g., "Launch MVP")
- FEATURE: Capability or deliverable within an Epic (e.g., "User Authentication")  
- STORY: User-facing requirement (e.g., "As a user, I want to login with Google")
- TASK: Concrete, executable unit of work (e.g., "Implement OAuth callback route")

Rules:
1. Extract ONLY actionable items. Ignore small talk and pleasantries.
2. Assign priorities based on urgency cues (deadlines, "ASAP", "critical").
3. Detect patterns across multiple transcriptions (repeated topics = higher priority).
4. Generate insights for items mentioned but never acted on.
5. Output MUST conform to the provided JSON schema. No prose.`,
};
```

---

## FASE 8 — Roadmap & Ações Pendentes

### Arquitetura de Componentes

```
src/app/tasks/ (G-Work Module)
├── page.tsx                    # Dashboard principal — insights + overview
├── kanban/
│   └── page.tsx                # Kanban Board (filtros por tipo/status/prioridade)
├── hierarchy/
│   └── page.tsx                # Tree view estilo ADO (Epic→Feature→Story→Task)
├── transcriptions/
│   └── page.tsx                # Lista de transcrições processadas + status
├── components/
│   ├── WorkItemCard.tsx        # Card de work item com type badge + status
│   ├── KanbanColumn.tsx        # Coluna do Kanban com drop zone
│   ├── HierarchyTree.tsx       # Tree view colapsável com cores por tipo
│   ├── InsightFeed.tsx         # Feed de insights da AI
│   ├── TranscriptionList.tsx   # Lista de .md files com status de processamento
│   └── QuickActions.tsx        # Ações rápidas (aprovar AI, mover, priorizar)
└── api/
    ├── process-transcriptions/ # Rota que ingere .md e chama Gemini
    ├── generate-work-items/    # Rota que gera hierarquia a partir de análise
    └── insights/               # Rota que gera/atualiza insights
```

### Checklist de Implementação

- [ ] **Tabelas Supabase** — Criar migration com `work_items`, `transcriptions`, `ai_insights` + RLS
- [ ] **API: Ingestão de Transcrições** — Rota que lê `.md` do Drive, hash SHA-256, dedup, salva
- [ ] **API: Processamento Gemini** — Rota que envia batch para Gemini Flash, valida output com Zod
- [ ] **API: Geração de Hierarquia** — Transforma output do Gemini em work items com parent/child
- [ ] **Dashboard Overview** — Page com stats, insights feed, work items recentes
- [ ] **Kanban Board** — Drag-and-drop com dnd-kit, filtros, glassmorphism cards
- [ ] **Hierarchy Tree** — Tree view colapsável, cores por tipo, expand/collapse animado
- [ ] **Transcription Manager** — Lista de arquivos, status de processamento, re-process
- [ ] **Insight Feed** — Cards de sugestões da AI, dismiss/act-on, links para work items
- [ ] **Design System** — Tokens CSS, componentes base, motion system
- [ ] **Testes** — RLS audit, schema validation, API response validation

---

## Vantagem Competitiva Assimétrica (Unfair Advantage)

> **O G-Work é o único produto no mercado que transforma transcrições `.md` em uma esteira de trabalho estruturada (Epic→Feature→Story→Task) com Kanban premium, via AI autônoma (Gemini), com zero input manual do usuário.**
>
> Enquanto:
> - **Azure DevOps** tem a hierarquia mas UI de 2015 e zero AI
> - **Linear** tem a estética mas hierarquia flat e zero ingestão autônoma
> - **Notion** tem o knowledge base mas AI agents que falham na execução
> - **Lindy/Granola** tem AI proativa mas sem gestão visual de trabalho
>
> **O G-Work combina o melhor de cada um e elimina o pior de todos.**
>
> *A vantagem é assimétrica porque um solo operator com Gemini pode entregar uma experiência que times de 50 engenheiros das big techs não conseguem — porque eles estão presos em legado.*
