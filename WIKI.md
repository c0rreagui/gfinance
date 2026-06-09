# G-Finance — Central Developer Wiki

Este documento é a fonte de verdade para desenvolvimento do **G-Finance** (anteriormente G-Hub), o sistema unificado de wealth management pessoal de Guilherme Corrêa. Mantido automaticamente pelo Antigravity Agent.

> **Última atualização:** 09 de junho de 2026

---

## 🧩 Ecossistema e Posicionamento

O **G-Finance** é o módulo de controle patrimonial do ecossistema G-Hub. Integra-se ao painel principal via portal `/` (G-Hub Command Center) e é complementado pelo módulo de produtividade G-Work em `/tasks`.

**Stack oficial:**
- **Frontend:** Next.js 15 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS v4
- **Banco de dados:** Supabase (PostgreSQL + Row-Level Security)
- **IA:** Google Gemini 2.5 Pro (CFO Persona, temporal awareness)
- **Deploy:** Vercel — `https://ghub-ia.vercel.app`
- **Supabase Project ID:** `jdliepgseoyoxfygmdet`

---

## 🗺️ Roteamento Completo

### Rotas de Interface (Frontend)

| Rota | Página | Status de Correlação de Dados |
|------|--------|-------------------------------|
| `/` | Portal G-Hub (seletor de app) | — |
| `/auth` | Login (Google OAuth + PIN) | Supabase Auth |
| `/finance` | Visão Geral (Dashboard) | ✅ Dinâmico (reconcilia saldos ao montar via `/api/finance/reconcile`, ignora transações futuras) |
| `/finance/calendar` | Calendário Financeiro | ✅ Dinâmico (calcula cash flow diário, Quick-Pay aciona trigger de transação automática) |
| `/transactions` | Extrato de Transações | ✅ Dinâmico (real-time subscription, exclui transações futuras no extrato geral) |
| `/cards` | Meus Cartões | ✅ Dinâmico via `credit_cards` + `transactions` (categoria "Cartão") |
| `/debts` | Controle de Dívidas | ✅ Dinâmico via `reminders` (`paid=false`) |
| `/subscriptions` | Assinaturas & Recorrências | ✅ Dinâmico via `reminders` (`is_recurring=true`) |
| `/wealth` | Investimentos & Patrimônio | ✅ Dinâmico via `goals` |
| `/analytics` | Relatórios & Analytics | ✅ Dinâmico, agrega todas as `transactions` do usuário |
| `/crypto` | Portfolio Cripto | ⚠️ Parcialmente dinâmico (balances via `crypto_wallets`, preços via CoinGecko live API) |
| `/gemini` | Gemini AI Brain (fullscreen) | ✅ Dinâmico, sessões persistidas via `/api/ai/sessions` |
| `/integrations` | Fontes de Dados | ✅ Dinâmico (Webhook de captura SMS ativo e logs persistentes em tempo real) |
| `/settings` | Ajustes | ✅ Dinâmico via `profiles`, `reconcile` em save |
| `/tasks` | G-Work — Kanban de Tarefas | ✅ Dinâmico via `tasks`, `tasks_projects`, `transcriptions` |

### Rotas de API e Integrações (Backend)

| Rota / Endpoint | Tipo | Função / Status |
|-----------------|------|-----------------|
| `/api/finance/reconcile` | POST | Força o recálculo dos saldos `total`, `income` e `expense` para o usuário ativo (ignora transações futuras). |
| `/api/finance/calendar/export` | GET | Retorna um arquivo `.ics` RFC 5545 com os lançamentos de lembretes e assinaturas para sincronização externa. |
| `/functions/v1/sms-webhook` | POST | Supabase Edge Function que processa mensagens de transações Itaú/genéricas via iOS Shortcuts. |


---

## 🗄️ Banco de Dados — Tabelas Supabase

Todas as tabelas possuem Row-Level Security (RLS) ativo: `USING (auth.uid() = user_id)`.

### Tabelas Financeiras Core

| Tabela | Chave Principal | Função / Alterações Recentes |
|--------|-----------------|------------------------------|
| `public.profiles` | `id = auth.uid()` | Perfil do usuário, saldo inicial (`initial_balance`), limite de cartão (`card_limit`), avatar, PIN. |
| `public.transactions` | `UUID` | Todas as movimentações financeiras. Negativo = despesa, positivo = receita. Contém `reminder_id` opcional e `source_hash` SHA-256. |
| `public.reminders` | `UUID` | Pagamentos futuros (dívidas e assinaturas). Usa `is_recurring`, `paid`, `urgency`, `frequency`, `category_icon`, `brand_color`. |
| `public.goals` | `UUID` | Metas de investimento/patrimônio com `target_amount` e `current_amount`. |
| `public.balances` | `UUID` | Cache recalculado automaticamente. Tipos: `total`, `income`, `expense`. |
| public.credit_cards | UUID | Metadados do cartão: card_name, last_four, expiration_date, card_limit, available_limit, spline_url. |
| `public.crypto_wallets` | `UUID` | Endereço da carteira crypto, provider e saldos de BTC/ETH/SOL. |
| `public.chat_sessions` | `UUID` | Sessões de conversa com o Gemini Brain. |
| `public.chat_messages` | `UUID` | Mensagens persistidas por sessão. |
| `public.itau_sync_logs` | `UUID` | Registros históricos de execuções de sincronização de extratos e webhooks SMS. |

### Automatizações via Banco de Dados (Triggers PostgreSQL)

Para garantir integridade de dados absoluta independente da origem da mutação (Frontend, API, IA ou Webhook), implementamos triggers reativos no Supabase:

1. **Reconciliação Automática de Saldos (`trigger_reconcile_on_transaction` e `trigger_reconcile_on_profile`):**
   - **Tabelas:** `public.transactions` (AFTER INSERT OR UPDATE OR DELETE) e `public.profiles` (AFTER UPDATE of `initial_balance`).
   - **Lógica:** Executa a função `public.reconcile_user_balances()`. Busca o `initial_balance` do usuário, soma todas as receitas e subtrai despesas da tabela `transactions` **onde a data seja menor ou igual ao momento atual** (`date <= now()`), excluindo lançamentos agendados para o futuro. Os resultados atualizam dinamicamente a tabela `public.balances`.
2. **Propagação de Lembretes Pagos (`trigger_reminder_paid_change`):**
   - **Tabela:** `public.reminders` (AFTER INSERT OR UPDATE OR DELETE).
   - **Lógica:** Executa `public.handle_reminder_paid_change()`. 
     - **Compatibilidade com Vínculo Manual**: Se a transação já estiver vinculada (`reminder_id` correspondente existe em `transactions`), o trigger não insere uma nova transação duplicada ao marcar o lembrete como pago (`paid = true`).
     - **Preservação de Dados Reais/Modificados**: Se o lembrete voltar para `paid = false` ou for excluído, o trigger verifica se a transação é real (`source_type = 'sms'`) ou foi modificada manualmente pelo usuário (descrição ou valor divergentes). Em caso afirmativo, apenas remove a associação definindo `reminder_id = NULL` (desvincular), mantendo o lançamento financeiro intacto. Caso contrário (se for a transação padrão auto-gerada), remove o registro da base para manter a integridade matemática.
3. **Limpeza de Fatura Manual em Pagamentos (`trigger_clear_manual_invoice_on_payment`):**
   - **Tabela:** `public.transactions` (AFTER INSERT).
   - **Lógica:** Executa `public.clear_manual_invoice_on_payment()` quando uma transação de pagamento de cartão sem `card_id` associado é inserida (`category = 'Cartão'` e `description` contém 'pagamento'). O trigger resolve o cartão correspondente no perfil do usuário (através do nome do cartão, últimos 4 dígitos ou caso especial Itaú) e atualiza seu `manual_invoice_amount` para `NULL`, sincronizando automaticamente o dashboard após a quitação da fatura.

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

- **Modelo:** `gemini-2.5-pro` — dinâmico
- **Formatação:** `formatMessageText()` remove `**` corretamente
- **Histórico:** Dropdown com lista de sessões, "Nova Conversa", auto-load da última sessão

### Capacidades Implementadas
- Consulta de saldo e transações recentes
- Criação de lembretes/dívidas via intent parsing
- Criação de despesas e receitas recorrentes (faculdade, salário, etc.)
- Histórico de sessões com dropdown glassmorphic

---

## 📊 Auditoria de Dados por Página (2026-06-02)

### ✅ Visão Geral (`/finance`)
- **Dados:** Busca de `balances`, `transactions` (últimas 5, filtrando transações futuras via `.lte('date', now)`), `reminders` (não pagos, próximos 2), `goals` (primeiros 2).
- **Gráfico:** SVG Bezier gerado dinamicamente a partir das transações reais e históricas consolidadas.
- **Reconciliação:** Disparada ao montar via chamada interna para o endpoint POST `/api/finance/reconcile` utilizando o token JWT da sessão, forçando a maturação de saldos agendados.
- **Spline Viewer:** ⚠️ Cenas 3D presentes. Um card reserva estático foi configurado para evitar layout shift durante o carregamento.
- **Hardcode residual:** Card number suffix `4290` no template do cartão visual.

### ✅ Calendário Financeiro (`/finance/calendar`)
- **Dados:** Consulta completa de `transactions` e `reminders` sem filtros temporais para exibição de fluxo de caixa futuro.
- **Projeção de Fluxo:** Calcula o saldo inicial retroativo até o primeiro dia do mês e projeta o saldo resultante dia a dia na grade.
- **Modo Privacidade:** Oculta todos os valores por padrão com efeito blur, permitindo revelação temporária ao mover o mouse segurando a tecla `Ctrl`.
- **iCal Subscription:** Endpoint `/api/finance/calendar/export` expõe os eventos formatados para sincronização no iOS ou Google Calendar.
- **Quick-Pay:** Permite pagar lembretes com um clique via interface, disparando os triggers de criação de transação correspondentes no banco.
- **Drag-and-Drop:** Permite arrastar lembretes na grade para atualizar suas datas de vencimento diretamente no banco.

### ✅ Gemini Brain (`/gemini` e componente `AiChatHub`)
- **Dados:** Sessões e mensagens 100% via Supabase. Context com transações reais injetadas no system prompt via API Route.
- **Modelo:** `gemini-2.5-pro` — dinâmico
- **Formatação:** `formatMessageText()` remove `**` corretamente
- **Histórico:** Dropdown com lista de sessões, "Nova Conversa", auto-load da última sessão

### ✅ Transações (`/transactions`)
- **Dados:** 100% via `transactions` table com filtro `user_id` + ordering por data.
- **Real-time:** Subscription ativa via `supabase.channel('schema-db-changes')`.
- **Adição:** Modal com form completo — description, category, amount, type, icon (com suporte a compras parceladas que auto-provisionam lembretes).
- **Vínculo Manual (Nova Funcionalidade)**: Coluna "Vínculo" na tabela de lançamentos permite associar transações reais (como capturas automáticas por SMS) a lembretes e assinaturas existentes em `reminders`. A interface exibe o vínculo ativo (`🔗 Título do Lembrete`) com botão de desvinculação em um clique (`handleUnlinkTransaction`).
- **Algoritmo de Matching Score**: Ao abrir o modal de vínculo, os lembretes são ordenados em tempo real por um algoritmo de proximidade:
  - **Diferença de Valor**: Lembretes com valores idênticos ou com até 5% de variação recebem `+100` pontos. Variações de até 20% recebem `+50` pontos.
  - **Proximidade Semântica**: O algoritmo divide a descrição da transação e o título do lembrete em palavras e atribui `+40` pontos para cada palavra em comum (com comprimento superior a 2 caracteres).
  - **Penalidade de Pago**: Se o lembrete já estiver marcado como pago, sofre uma penalidade de `-10` pontos para priorizar lembretes em aberto.
- **Trigger:** Após mutação ou vínculo, chama `fetchTransactions()` para re-sincronizar a lista.

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

### ✅ Fontes de Dados (`/integrations`)
- **Dados:** Histórico de logs de sincronização lidos diretamente da tabela `public.itau_sync_logs`.
- **Webhook SMS:** URL dinâmica contendo o `user_id` do usuário conectado para fácil setup no Atalhos do iOS.
- **Edge Function SMS Parser**: Recebe payloads JSON ou texto simples de SMS, identifica o tipo (Pix Recebido, Compra aprovada no cartão Itaúcard/genérica, Pix Enviado), gera hash de deduplicação SHA-256 e persiste na base.
  - **Sincronização de Limite Disponível**: Se o SMS contém a string de limite disponível (regex `limite\s+(?:disponivel|disponível)...`), a Edge Function extrai este valor e atualiza a coluna `available_limit` do respectivo cartão na tabela `credit_cards`.
  - **Cálculo de Valor BRL por Diferença de Limite**: Para compras de cartão (não pagamentos de fatura), se houver um limite disponível anterior armazenado e o SMS trouxer o novo limite disponível, o valor final da compra em reais (BRL) é calculado pela diferença (`prevLimit - newLimit`). Isso soluciona de forma elegante a conversão e captura exata de compras em moeda estrangeira (USD) na fatura local.
- **Processamento de Extratos:** Upload de arquivos PDF/OFX/CSV com parser regex estruturado e fallback automático para processador semântico de IA da API Gemini.

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
- **Origens JS autorizadas:** `http://localhost:3000`, `https://ghub-ia.vercel.app`
- **URI de redirect:** `https://jdliepgseoyoxfygmdet.supabase.co/auth/v1/callback`

### Supabase Dashboard — URL Configuration
- **Site URL:** `https://ghub-ia.vercel.app`
- **Redirect URLs:** `http://localhost:3000/*`, `https://ghub-ia.vercel.app/*`

### Variáveis de Ambiente (`.env.local` + Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=https://jdliepgseoyoxfygmdet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=<salvo no gerenciador — não commitar>
GOOGLE_CLIENT_ID=<salvo no gerenciador — não commitar>
GOOGLE_CLIENT_SECRET=<salvo no gerenciador — não commitar>
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

## 🛡️ Isolamento de Ecossistemas (G-Finance ↔ G-Work)

Para evitar acoplamento acidental e regressões em futuras sessões de IA ou refatorações, o G-Hub implementa um isolamento estrito entre os ecossistemas:
- **Camada de Código (Linter):** Regras de `"no-restricted-imports"` no `eslint.config.mjs` impedem a importação de módulos do G-Finance (como `finance`, `transactions`, `cards`, `debts`, `subscriptions`, `wealth`, `analytics`, `crypto`, `integrations`) por arquivos do G-Work (`src/app/tasks`) e vice-versa.
- **Camada de Dados (Supabase):** As migrações, tabelas e procedimentos do G-Work (`tasks`, `tasks_projects`, `transcriptions`) são completamente segregados dos triggers e tabelas financeiras do G-Finance.

---

## 🧭 Próximas Ações Prioritárias

| Prioridade | Item |
|------------|------|
| 🔴 CRÍTICO | Substituir `<spline-viewer>` no dashboard por CSS 3D Card (eliminar crash potencial). |
| 🔴 CRÍTICO | Crypto: remover valores placeholder do auto-provision. Criar onboarding real de saldo cripto. |
| 🟡 ALTO | Analytics: adicionar filtro por período (mês/ano) para granularidade. |
| 🟢 MÉDIO | Cards: remover prefixo `4290 8812 3456` hardcoded — usar apenas máscara genérica com `last_four`. |
| 🟢 BAIXO | Crypto: implementar integração com Binance/Coinbase API para balanços reais. |
| 🟢 BAIXO | Calendário: adicionar suporte a gestos no mobile para revelação de valores em privacidade (Tap-to-reveal). |

---

*Wiki gerada e mantida pelo Antigravity Agent • Auditoria: 02/06/2026*

---

## 📓 Histórico de Validações (Audit Logs)

### 🗓️ 02 de Junho de 2026 — /hm-DeEnQaUxVallPloy Pipeline
- **Veredicto:** BASELINE-READY
- **Findings CRITICO/ALTO:**
  - `[ALTO] Rota de Teste Exposta`: `/api/ai/test/route.ts` expõe diagnósticos sem autenticação obrigatória. Ação: Deletar ou restringir rota.
  - `[ALTO] Tipo Any no Código`: Uso extenso de `any` em `reconcile.ts` e `page.tsx` quebrando strict checks. Ação: Tipagem estrita.
- **UX/UI Highlights:** Substituir spinners de carregamento inicial por shimmer skeletons. Implementar suporte mobile para privacidade no Calendário.
- **Status de Deploy:** Aprovado para Vercel/Supabase.

### 🗓️ 09 de Junho de 2026 — /hm-DeEnQaUxVallPloy Pipeline
- **Veredicto:** BASELINE-READY
- **Findings G-Work:**
  - `[PASS]` G-Work: Painel Bento, Kanban Dnd, Árvore Hierárquica e Curation AI validados.
  - `[PASS]` Google Drive Sync: Permissão `drive.readonly` integrada, seletor de pastas e sync automático/manual ativo com integridade SHA-256.
  - `[PASS]` Compilação: Next.js build e strict typecheck 100% verdes (zero erros).
  - `[PASS]` Análise de IA e Resiliência: Adicionada resiliência na análise de IA para arquivos grandes (Vercel timeout estendido para 300s via `maxDuration`). Corrigido fallback automático para múltiplos modelos do Gemini (`gemini-2.5-flash-lite` prioritário, evitando erros 503 e 429 de limites de cota da free tier).
  - `[PASS]` UX/UI: Implementada prevenção contra crashes ao receber erros HTML no parsing de JSON, e reset automático de mensagens de erro ao alternar gravações selecionadas.
  - `[PASS]` Kanban Drag-and-Drop: Reestruturada a funcionalidade de movimentação com o uso de `@dnd-kit/core` `<DragOverlay>` para evitar quebras de layout (layout shift) e lentidão. Expandimos o arrastar para a área inteira do card com z-index configurado, leve rotação (-1deg) e sombras durante o movimento, gerando uma experiência tátil, fluida e de altíssimo padrão visual.
  - `[PASS]` Ações em Massa (Transcrições): Implementado modo de seleção em massa na aba de gravações, permitindo exclusão em lote, alteração de projeto em lote e processamento sequencial de IA com espaçamento temporal (800ms) para respeitar cotas de requisições da API do Gemini. Exibido via barra de controle flutuante glassmorphic no rodapé. Adicionada uma caixa de seleção mestre ("Selecionar Tudo") com suporte a estado indeterminado para gerenciar facilmente a seleção dos itens filtrados na barra lateral.
  - `[PASS]` Edição em Massa (BulkEditModal): Criado e integrado o modal `BulkEditModal` que permite edições complexas em lote: mudança de projeto, ajuste da data da gravação, renomeação estruturada de arquivos (prefixo, sufixo e localizar/substituir) e redefinição/atualização do estado de IA (redefinir para pendente para reanálise ou marcar manualmente como auditado).
  - `[PASS]` Consolidação com IA: Desenvolvida a funcionalidade de consolidação para 2 ou mais gravações selecionadas. A API `/api/tasks/consolidate` consome as transcrições selecionadas e seus resumos individuais para gerar uma Análise Geral Consolidada sem redundâncias de tarefas, mapeando decisões estratégicas, datas e gerando tarefas hierárquicas limpas integradas ao Kanban. Se houver itens pendentes de análise na seleção, a aplicação executa automaticamente e de forma sequencial a análise individual antes de disparar o agrupamento geral.
  - `[PASS]` Memória Híbrida do Agente IA (G-Work): Implementado o motor de memória dinâmica e estática. O núcleo estático utiliza arquivos locais no repositório (`src/lib/gwork/memory/` contendo `persona.md`, `alma.md` e `funcoes.md`), e o dinâmico persistido na nova tabela `public.agent_memories`. O Gemini extrai fatos/regras (`extracted_memories`), exibidos para revisão e salvamento na nova aba "Aprendizado & Memória" do `AiCurationModal`. Criada aba de gerenciamento integrado em `/settings` com editor de Markdown para os arquivos locais e controle de ligar/desligar/deletar regras da memória dinâmica.
  - `[PASS]` Curadoria Interativa & Chat (Curation Chat): Criado pipeline de 3 estados para transcrições: Pendente (Amber), Rascunho (Purple) e Auditado (Emerald). Separamos a análise de IA da persistência direta no Kanban: toda análise gera um rascunho de IA (Draft) gravado temporariamente em `extracted_entities` (com `processed_at = null`), sem poluir o banco de dados. Desenvolvemos uma interface de curadoria com layout side-by-side (`max-w-5xl`): a proposta à esquerda e um chat de refinamento à direita, permitindo que o usuário converse diretamente com a IA para corrigir, deletar ou priorizar tarefas. O chat é processado pelo Gemini na nova rota `/api/tasks/curate/chat`, persistindo o progresso e o histórico de mensagens no banco em tempo real. A persistência definitiva no Kanban (tarefas recursivas, insights e memórias) e o fechamento do áudio (`processed_at = now()`) são executados com um único clique via `/api/tasks/curate/approve`.
- **Status de Deploy:** Pushed to GitHub. Deploy ativo na Vercel.


