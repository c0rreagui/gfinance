# G-Finance — Central Developer Wiki

Este documento é a fonte de verdade para desenvolvimento do **G-Finance** (anteriormente G-Hub), o sistema unificado de wealth management pessoal de Guilherme Corrêa. Mantido automaticamente pelo Antigravity Agent.

> **Última atualização:** 01 de junho de 2026

---

## 🧩 Ecossistema e Posicionamento

O **G-Finance** é o módulo de controle patrimonial do ecossistema G-Hub. Integra-se ao painel principal via portal `/` (G-Hub Command Center) e é complementado pelo módulo de produtividade G-Work em `/tasks`.

**Stack oficial:**
- **Frontend:** Next.js 15 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS v4
- **Banco de dados:** Supabase (PostgreSQL + Row-Level Security)
- **IA:** Google Gemini 2.5 Pro (CFO Persona, temporal awareness)
- **Deploy:** Vercel — `https://gfinance-lovat.vercel.app`
- **Supabase Project ID:** `jdliepgseoyoxfygmdet`

---

## 🗺️ Roteamento Completo

| Rota | Página | Status de Correlação de Dados |
|------|--------|-------------------------------|
| `/` | Portal G-Hub (seletor de app) | — |
| `/auth` | Login (Google OAuth + PIN) | Supabase Auth |
| `/finance` | Visão Geral (Dashboard) | ✅ Dinâmico via `balances`, `transactions`, `reminders`, `goals` |
| `/finance/calendar` | Calendário Financeiro | ✅ Dinâmico via `transactions` + `reminders` |
| `/transactions` | Extrato de Transações | ✅ Dinâmico, Real-time subscription |
| `/cards` | Meus Cartões | ✅ Dinâmico via `credit_cards` + `transactions` (categoria "Cartão") |
| `/debts` | Controle de Dívidas | ✅ Dinâmico via `reminders` (`paid=false`) |
| `/subscriptions` | Assinaturas & Recorrências | ✅ Dinâmico via `reminders` (`is_recurring=true`) |
| `/wealth` | Investimentos & Patrimônio | ✅ Dinâmico via `goals` |
| `/analytics` | Relatórios & Analytics | ✅ Dinâmico, agrega todas as `transactions` do usuário |
| `/crypto` | Portfolio Cripto | ⚠️ Parcialmente dinâmico (balances via `crypto_wallets`, preços via CoinGecko live API) |
| `/gemini` | Gemini AI Brain (fullscreen) | ✅ Dinâmico, sessões persistidas via `/api/ai/sessions` |
| `/integrations` | Fontes de Dados | 🔍 Ver nota abaixo |
| `/settings` | Ajustes | ✅ Dinâmico via `profiles`, `reconcile` em save |
| `/tasks` | G-Work — Kanban de Tarefas | ✅ Dinâmico via `tasks`, `tasks_projects`, `transcriptions` |

---

## 🗄️ Banco de Dados — Tabelas Supabase

Todas as tabelas possuem Row-Level Security (RLS) ativo: `USING (auth.uid() = user_id)`.

### Tabelas Financeiras Core

| Tabela | Chave Principal | Função |
|--------|-----------------|--------|
| `public.profiles` | `id = auth.uid()` | Perfil do usuário, saldo inicial (`initial_balance`), limite de cartão (`card_limit`), avatar, PIN |
| `public.transactions` | `UUID` | Todas as movimentações financeiras. Negativo = despesa, positivo = receita |
| `public.reminders` | `UUID` | Pagamentos futuros (dívidas e assinaturas). Usa `is_recurring`, `paid`, `urgency`, `frequency`, `category_icon`, `brand_color` |
| `public.goals` | `UUID` | Metas de investimento/patrimônio com `target_amount` e `current_amount` |
| `public.balances` | `UUID` | Cache recalculado pelo `reconcileBalances`. Types: `total`, `income`, `expense` |
| `public.credit_cards` | `UUID` | Metadados do cartão: `card_name`, `last_four`, `expiration_date`, `card_limit`, `spline_url` |
| `public.crypto_wallets` | `UUID` | Endereço da carteira crypto, provider e saldos de BTC/ETH/SOL |
| `public.chat_sessions` | `UUID` | Sessões de conversa com o Gemini Brain |
| `public.chat_messages` | `UUID` | Mensagens persistidas por sessão |

### Tabelas G-Work

| Tabela | Função |
|--------|--------|
| `public.tasks_projects` | Projetos / clientes associados a tarefas |
| `public.tasks` | Kanban com status (`todo`, `in_progress`, `completed`) e prioridade |
| `public.transcriptions` | Transcrições de áudio do Google Drive integradas ao Gemini Parser |

---

## ⚙️ Módulos de Biblioteca

### `src/lib/supabase.ts`
Cliente Supabase instanciado com as variáveis de ambiente do projeto.

### `src/lib/reconcile.ts`
Utilitário core de reconciliação de saldos. Chamado após toda mutação de transações.

**Fluxo:**
1. Busca todas as `transactions` do usuário
2. Lê `initial_balance` do `profiles`
3. Calcula `income`, `expense`, `total = initial_balance + income - expense`
4. Verifica se já existem linhas na tabela `balances` por tipo (`total`, `income`, `expense`)
5. Faz `update` se existir, `insert` se não existir (robusto a novos usuários)

### `src/lib/crypto.ts`
Criptografia de PIN via `bcrypt` para armazenamento seguro.

---

## 🧠 Gemini AI Brain

- **Modelo:** `gemini-2.5-pro-preview-05-06`
- **Rota API:** `/api/ai/chat` (POST)
- **Sessões:** `/api/ai/sessions` (GET/POST)
- **System Prompt:** CFO Persona com acesso temporal, histórico de transações do Supabase injetado no contexto, awareness de metas e saldos
- **Formato:** Histórico de `ChatMessage[]` com `role: 'user' | 'model'` e `parts: [{ text }]`
- **Parser:** Remoção de `**` via `formatMessageText()`
- **Persistência:** Todas as mensagens e sessões são salvas nas tabelas `chat_sessions` e `chat_messages`

### Capacidades Implementadas
- Consulta de saldo e transações recentes
- Criação de lembretes/dívidas via intent parsing
- Criação de despesas e receitas recorrentes (faculdade, salário, etc.)
- Histórico de sessões com dropdown glassmorphic

---

## 📊 Auditoria de Dados por Página (2026-06-01)

### ✅ Visão Geral (`/finance`)
- **Dados:** Busca de `balances`, `transactions` (últimas 5), `reminders` (não pagos, próximos 2), `goals` (primeiros 2)
- **Gráfico:** SVG Bezier gerado dinamicamente a partir das transações reais
- **Reconciliação:** Disparada ao montar (`reconcileBalances`) para garantir `balances` sempre atualizado
- **Spline Viewer:** ⚠️ Ainda presente no código (`<spline-viewer>`) — pode causar crash com cenas corrompidas. **Recomendação:** substituir por card CSS 3D.
- **Hardcode residual:** Card number suffix `4290` no template do cartão visual

### ✅ Gemini Brain (`/gemini` e componente `AiChatHub`)
- **Dados:** Sessões e mensagens 100% via Supabase. Context com transações reais injetadas no system prompt via API Route.
- **Modelo:** `gemini-2.5-pro` — dinâmico
- **Formatação:** `formatMessageText()` remove `**` corretamente
- **Histórico:** Dropdown com lista de sessões, "Nova Conversa", auto-load da última sessão

### ✅ Transações (`/transactions`)
- **Dados:** 100% via `transactions` table com filtro `user_id` + ordering por data
- **Real-time:** Subscription ativa via `supabase.channel('schema-db-changes')`
- **Adição:** Modal com form completo — description, category, amount, type, icon
- **Trigger:** Após mutação, chama `fetchTransactions()` para re-sincronizar a lista

### ✅ Cartões (`/cards`)
- **Dados:** `credit_cards` (metadados do cartão) + `transactions` filtradas por `category = 'Cartão'`
- **Auto-provision:** Se não existir cartão no banco, insere automaticamente com defaults
- **Limite:** Editável via slider, salvo em `profiles.card_limit` e `credit_cards.card_limit`
- **Hardcode residual:** Prefixo do número `4290 8812 3456 ` é fixo (apenas `last_four` é dinâmico). Endereço de Spline URL fixo no insert inicial.

### ✅ Dívidas (`/debts`)
- **Dados:** `reminders` filtrados por `paid=false` e ordenados por `due_date`
- **Cálculos:** `totalDebt`, `installmentsThisMonth`, `projectedClearDate` — todos derivados via `useMemo` dos dados reais
- **Timeline:** 6 próximas dívidas futuras mapeadas dinamicamente
- **Sem hardcodes**

### ✅ Assinaturas (`/subscriptions`)
- **Dados:** `reminders` filtrados por `is_recurring=true`
- **Resolução:** `resolveSubscription()` mapeia `category_icon` e `brand_color` do banco para estilo visual
- **Calendário de cobranças:** Gerado dinamicamente a partir de `due_date` das recorrências
- **Status `ativa`/`pausada`:** Derivado do campo `paid` do reminder
- **Sem hardcodes de conteúdo** — only UI configuration constants (gradientes, icon map)

### ✅ Investimentos (`/wealth`)
- **Dados:** `goals` table com `current_amount` e `target_amount`
- **Donut SVG:** Gerado via arcos SVG dinâmicos baseados em `current_amount` de cada goal
- **Cálculos:** `totalInvested`, `totalTarget`, `remainingToGoal`, `averageProgress` — todos via `useMemo`
- **Sem hardcodes**

### ✅ Relatórios (`/analytics`)
- **Dados:** Busca **todas** as `transactions` sem filtro (para análise completa)
- **KPIs:** `income`, `expense`, `balance`, `savingsRate` — calculados via `useMemo` das transações reais
- **Breakdown por categoria:** Agrupamento dinâmico por `category`
- **Tendência mensal:** Agrupamento por mês/ano com sparkline SVG dinâmico
- **Sem hardcodes**

### ⚠️ Cripto (`/crypto`)
- **Preços ao vivo:** CoinGecko API (`https://api.coingecko.com/api/v3/simple/price`)
- **Saldos:** `crypto_wallets` table — **ALERTA:** Auto-provision usa valores placeholder (`balance_btc: 0.185`, `balance_eth: 2.45`, `balance_sol: 28.60`) para novos usuários. Esses valores são **fixtures**, não refletem saldo real.
- **Carteira:** Endereço `0x71C2522ec...` é hardcoded no insert inicial.
- **Sparklines:** Gerados deterministicamente por seed, não refletem dados históricos reais.
- **Ação requerida:** Criar fluxo de onboarding para usuário inserir seus saldos reais / conectar exchange API.

### 🔍 Fontes de Dados (`/integrations`)
- Precisa de revisão de código específica. Não auditado neste ciclo.

### ✅ Ajustes (`/settings`)
- **Dados:** `profiles` table — nome, avatar, PIN, `initial_balance`
- **Google OAuth:** Auto-sync de `avatar_url` e `full_name` do Google metadata
- **PIN:** Criptografado via `encryptPassword()` antes de salvar
- **Reconciliação:** Ao salvar `initial_balance`, chama `reconcileBalances()` para recalcular `balances`

---

## 🔑 Credenciais e Configurações de Infraestrutura

### Google Cloud Console (OAuth 2.0)

> [!IMPORTANT]
> O Google Client Secret **não está** neste arquivo por segurança. Está salvo no gerenciador de senhas e configurado nas variáveis de ambiente Vercel/Supabase.

- **Google Client ID:** `47747863323-cmkdq8t20cuov1ddnhkgqemol13hleqg.apps.googleusercontent.com`
- **Origens JS autorizadas:** `http://localhost:3000`, `https://gfinance-lovat.vercel.app`
- **URI de redirect:** `https://jdliepgseoyoxfygmdet.supabase.co/auth/v1/callback`

### Supabase Dashboard — URL Configuration
- **Site URL:** `https://gfinance-lovat.vercel.app`
- **Redirect URLs:** `http://localhost:3000/*`, `https://gfinance-lovat.vercel.app/*`

### Variáveis de Ambiente (`.env.local` + Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=https://jdliepgseoyoxfygmdet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=<salvo no gerenciador — não commitar>
```

---

## 📐 Design System

- **Paleta:** Dark-first. `slate-950` base, `emerald-500` accent principal
- **Glassmorphism:** `bg-white/5`, `backdrop-blur-md`, `border-white/10`
- **Tipografia:** Tailwind default (Inter via Google Fonts no layout global)
- **Bordas:** `rounded-[32px]` e `rounded-[40px]` para cards principais
- **Animações:** `animate-in`, `chart-path` (SVG draw), stagger delay por `animationDelay`
- **Referências visuais:** Apple, Stripe, Linear, Airbnb — dark editorial cinematográfico

---

## 🧭 Próximas Ações Prioritárias

| Prioridade | Item |
|------------|------|
| 🔴 CRÍTICO | Substituir `<spline-viewer>` no dashboard por CSS 3D Card (eliminar crash potencial) |
| 🔴 CRÍTICO | Crypto: remover valores placeholder do auto-provision. Criar onboarding real de saldo cripto |
| 🟡 ALTO | Auditar `/integrations` (Fontes de Dados) — não auditado neste ciclo |
| 🟡 ALTO | Analytics: adicionar filtro por período (mês/ano) para granularidade |
| 🟢 MÉDIO | Transações: acionar `reconcileBalances()` após cada insert/delete para manter `balances` sincronizado |
| 🟢 MÉDIO | Cards: remover prefixo `4290 8812 3456` hardcoded — usar apenas máscara genérica com `last_four` |
| 🟢 BAIXO | Crypto: implementar integração com Binance/Coinbase API para balanços reais |

---

*Wiki gerada e mantida pelo Antigravity Agent • Auditoria: 01/06/2026*
