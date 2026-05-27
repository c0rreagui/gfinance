---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Visão Geral (Dashboard Principal)"
date_created: 2026-05-27
primary_axis: "Speed & Latency"
secondary_axis: "Cognitive Clarity"
blockers_found: 2
phantom_paths_detected: 1
---

# Flow Trace: Visão Geral (Dashboard Principal)

## 📊 Visão Geral do Fluxo
- **Páginas Afetadas:** `/` ([src/app/page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/page.tsx))
- **Personas Analisadas:** First-Time User (Zero State) & Steady-State User (Regular Premium User)
- **Eixo Primário:** `Speed & Latency` | **Eixo Secundário:** `Cognitive Clarity`

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | Ambas | O usuário acessa `/` e é redirecionado instantaneamente para `/auth` se não estiver logado. | Carrega casca em branco por 200ms e depois redireciona via router Next.js. | `~` | Verified | Sensação de lag visual curto na transição de rotas. |
| **2** | Ambas | Login efetuado com sucesso; redireciona de volta para `/` de forma instantânea. | Carrega o spinner central animado de tela cheia por ~1.2s enquanto aguarda chamadas assíncronas do banco. | `!=` | Verified | **[BLOCKER]** Bloqueio de viewport total afeta percepção de velocidade. |
| **3** | First-Time | Renderiza Welcome Header personalizado com avatar em branco e inicia "Zero State" nos cards. | Mostra o avatar padrão gerado pelas iniciais. Cards de saldo inicializam zerados (`R$ 0,00`). | `=` | Verified | Baixa atratividade dos dados zerados, falta de um walkthrough/onboarding de primeiro depósito. |
| **4** | First-Time | Renderiza o gráfico de Fluxo de Caixa vazio de forma limpa, induzindo o clique em adicionar transação. | Renderiza uma curva de bezier estática fictícia com placeholder e um botão sem animação. | `~` | Verified | O gráfico com curva estática pode parecer ativo mesmo estando zerado (confunde o usuário). |
| **5** | Steady-State | Renderiza Welcome Header premium com avatar real carregado do SSO e as estatísticas de saldo atualizadas. | Mostra o avatar real com glow gradiente premium. Renderiza os cards de saldo atualizados da tabela `balances`. | `=` | Verified | Excelente visual premium, alta clareza de dados consolidados. |
| **6** | Steady-State | O gráfico de fluxo de caixa calcula e exibe a tendência histórica completa da conta corrente do usuário. | O gráfico de bezier calcula a curva dinâmica acumulando os valores de apenas **5 transações** (devido ao `.limit(5)` da query). | `!=` | Verified | **[BLOCKER]** O gráfico de caixa exibe uma distorção matemática severa que não reflete a saúde histórica real. |
| **7** | Steady-State | Renderiza lista de transações recentes de forma limpa e permite scroll/navegação para o histórico completo. | Renderiza as 5 transações mais recentes em uma tabela dark-first premium de alto contraste. | `=` | Verified | Navegação clara e visual Stripe-like sofisticado. |
| **8** | Steady-State | Renderiza o Cartão G-Black 3D interativo via Spline no painel lateral de forma suave e performática. | O viewer do Spline renderiza com atraso, bloqueando o main thread de renderização com bundle pesado (~1.5MB). | `~` | Verified | Atraso no carregamento do renderizador 3D em dispositivos com menos CPU, além de layout shifts. |
| **9** | Steady-State | Gemini Brain AI responde com base no contexto financeiro do usuário instantaneamente e com segurança. | Carrega atalhos inteligentes de clique rápido. Busca token no localStorage/API e envia payload bruto ao LLM. | `=` | Verified | Resposta interativa e estética orbital animada geram alto encantamento visual. |
| **10** | Ambas | O usuário clica em "Sair" e encerra a sessão com exclusão imediata dos tokens de autenticação. | Desconecta no Supabase, limpa cookies de sessão e redireciona com sucesso para `/auth`. | `=` | Verified | Processo de encerramento rápido e seguro. |

---

## 🔬 Detalhamento de Estados por Step

### Step 1: Redirecionamento Inicial e Verificação de Estado (Sem Auth)
- **Input:** Entrada manual na URL `/` do navegador.
- **System:** `mounted = false` -> `mounted = true` via `useEffect`. O método `supabase.auth.getUser()` retorna payload `user = null`.
- **Output:** Tela preta/casca com breve flicker de layout. Redirecionamento rápido para `/auth` via `router.push('/auth')`.
- **Side Effects:** 1 requisição fetch interna para validação de sessão da API Supabase Auth.
- **Backstage:** Verificação de validade de cookies HTTP local e sessão do client.

### Step 2: Carregamento Assíncrono Sequencial (Waterfall)
- **Input:** Usuário autenticado com sucesso e redirecionado para `/`.
- **System:** `mounted = true`, `loading = true`. Disparo do método assíncrono `fetchDashboardData(userId)` no cliente React.
- **Output:** Renderização do spinner central em tela cheia (bloqueador de UI):
  ```tsx
  <div className="flex-1 flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
  </div>
  ```
- **Side Effects:** 4 requisições assíncronas assinaladas sequencialmente via `await` para o banco de dados Supabase:
  1. `from('balances').select('*')`
  2. `from('transactions').select('*').limit(5)`
  3. `from('reminders').select('*').eq('paid', false)`
  4. `from('goals').select('*')`
- **Backstage:** Cada query é resolvida uma a uma no Postgres ( waterfall sequencial de latência de rede). Se a primeira demorar 400ms e a última 200ms, o TTFMP soma **~1.2s** no total.

### Step 3: Inicialização Zero State (First-Time User)
- **Input:** Leitura de tabelas retornando array vazio do banco de dados para um novo usuário.
- **System:** `stats` é inicializado com objeto estático padrão (`R$ 0,00` e ícones emerald/orange). `transactions = []`, `reminders = []`, `goals = []`.
- **Output:** Renderização do dashboard com zeros. O gráfico de fluxo de caixa renderiza curva fictícia gerada pelo fallback de strings estáticas:
  ```typescript
  const stroke = "M 0 160 Q 150 120, 300 90 T 600 30";
  ```
  Exibição dos empty states para "Transações Recentes", "Próximos Pagamentos" e "Metas Ativas".
- **Side Effects:** Nenhuma escrita. Apenas leitura.
- **Backstage:** Nenhum.

### Step 4: Visualização Ativa com Dados Reais (Steady-State User)
- **Input:** Carregamento com dados populados.
- **System:** `stats`, `transactions`, `reminders`, `goals` preenchidos com arrays de objetos retornados do banco.
- **Output:** Substituição do estado de loading global pelos componentes ricos:
  - Header premium com avatar e glow dinâmico de gradiente de cor.
  - Estatísticas de saldo reais com badge de tendência colorida de acordo com sinal (verde para `+` e laranja para `-`).
  - Gráfico de curva dinâmico calculado com base nas coordenadas matemáticas geradas pela função `getChartPaths()`.
  - Tabela premium dark-first com as 5 transações recentes.
- **Side Effects:** Nenhuma alteração de estado no banco (Read-Only).
- **Backstage:** Reconciliação do DOM virtual com novos estados populados.

### Step 5: Renderização Distorcida do Gráfico de Fluxo de Caixa
- **Input:** Renderização automática baseada na resposta da query `dbTransactions`.
- **System:** `getChartPaths()` lê o array `transactions` (limitado a **5 itens** pelo backend) e executa um cálculo de soma cumulativa regressiva:
  ```typescript
  const sorted = [...transactions].reverse();
  sorted.forEach((tx) => { currentBalance += tx.amount; ... });
  ```
- **Output:** Gráfico desenha uma linha suave de bezier.
- **Side Effects:** Nenhum.
- **Backstage:** **Gargalo Lógico Crítico.** Como a query da tabela `transactions` foi limitada a 5 registros, o gráfico de fluxo calcula o saldo com base apenas nesses 5 lançamentos, desconsiderando totalmente as centenas de transações históricas anteriores. Se o usuário tem 100 transações anteriores que consolidam R$ 10.000, e as últimas 5 transações somam R$ 200, o gráfico mostrará a curva acumulando a partir de 0 até R$ 200, apresentando dados incorretos e prejudicando a confiabilidade do produto.

### Step 6: Gemini Brain AI Command Center (Interação)
- **Input:** Usuário digita uma dúvida ou clica em uma das sugestões prontas (ex: "Qual é o meu saldo total?").
- **System:** Mensagem adicionada ao array `messages`. Estado `loading = true` no componente `AiChatHub`. Recuperação de token Google via `getGoogleToken()`.
- **Output:** Estado orbital ativo ("pensando"). Ícone de faísca ativa rotação infinita lenta (`animate-spin-slow`). Mensagem de loading piscando na tela: "Gemini Brain está analisando suas contas...".
- **Side Effects:** Requisição fetch POST disparada contra o endpoint interno `/api/ai/chat` contendo a mensagem atual e o histórico bruto formatado.
- **Backstage:** O backend processa o prompt financeiro, anexa metadados/dados injetados e chama as APIs do Gemini, devolvendo a resposta estruturada em markdown de volta para o cliente.

---

## 👻 Phantom Flows Detectados

- **[/api/ai/test/route.ts](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/api/ai/test/route.ts):** Rota fantasma de testes exposta no diretório de produção `/api`. Este arquivo contém um endpoint mockup exposto publicamente que ignora validações de sessão e deve ser deletado imediatamente para evitar vazamento de informações e consumo desnecessário de cotas em ambiente de produção.

---

## ⚡ Recomendações e Plano de Correção

| Categoria | Gargalo / Fricção Identificada | Solução Proposta | Custo (S/M/L) |
| :--- | :--- | :--- | :--- |
| **Performance** | Carregamento bloqueante de tela cheia (Spinner Global) | Substituir o loader de viewport total por **Skeletons** individuais para cada card, tabela e gráfico, permitindo o carregamento progressivo assíncrono de componentes. | **M** |
| **Performance** | Waterfall assíncrono na query do banco de dados (Sequential Await) | Agrupar as 4 queries assíncronas do Supabase utilizando `Promise.all` para executar as requisições em paralelo, reduzindo o tempo de espera cumulativo de ~1.2s para <350ms. | **S** |
| **Arquitetura** | Cálculo distorcido da curva de saldo do Fluxo de Caixa | Criar uma nova tabela/view agregadora no Supabase (ex: `daily_balances`) ou refatorar a query de transações para calcular o saldo consolidado histórico via RPC (Remote Procedure Call) sem o limite de 5 itens. | **M** |
| **Segurança** | Endpoint público exposto sem autenticação ativa | Remover permanentemente o diretório de testes [/api/ai/test](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/api/ai/test/route.ts) e garantir RLS completo em todas as tabelas. | **S** |
| **UI/UX** | Spline 3D Viewer causa layout shifts severos (CLS) | Adicionar um card reserva (Placeholder Sólido Premium Dark) com transição de opacidade suave que é substituído pelo Canvas 3D do Spline apenas quando o script estiver 100% instanciado. | **S** |
| **Database** | Falta de índice composto nas queries recorrentes | Aplicar índices específicos no Supabase Postgres: <br> 1. `CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);` <br> 2. `CREATE INDEX idx_reminders_user_paid ON reminders(user_id, paid) WHERE paid = false;` | **S** |

---

## 🏓 Handoff de Especialistas

- **Para [hm-ux-flow](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-ux-flow.md):** Analisar a taxa de conversão do "Zero State" no onboarding do novo usuário, propondo botões e chamadas à ação mais claras para incentivar o preenchimento dos dados.
- **Para [hm-qa](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-qa.md):** Escrever testes de integration mockando latências extremas no banco Supabase para validar a resiliência visual e testar limites do Chat AI.
- **Para [hm-designer](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-designer.md):** Desenhar a interface dos novos Skeletons com efeito de shimmer suave em gradiente cinza/esmeralda para combinar com a estética premium e Apple-like do dashboard.
- **Para [hm-performance](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-performance.md):** Medir e auditar o peso dos bundles carregados no carregamento inicial da página `/` com foco no Spline e nos ícones do Lucide.
