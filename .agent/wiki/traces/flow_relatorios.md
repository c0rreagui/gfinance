---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Relatórios & Financial Analytics"
date_created: 2026-05-27
primary_axis: "Speed & Latency"
secondary_axis: "Cognitive Clarity"
blockers_found: 2
phantom_paths_detected: 0
---

# Flow Trace: Relatórios (Financial Reports & Analytics)

## 📊 Visão Geral do Fluxo

A página de **Relatórios & Analytics** (`/analytics`) é o painel analítico consolidado do G-Finance. Ela extrai transações do Supabase, executa agregações em tempo real no lado do cliente e renderiza KPIs financeiros de alto nível, um gráfico de barras animado para despesas por categoria, um gráfico SVG de linha de tendência mensal e uma tabela interativa com capacidades de ordenação por múltiplas colunas.

- **Páginas Afetadas:** `/analytics` (diretório físico: [page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/analytics/page.tsx))
- **Personas Analisadas:**
  - **First-Time User (Zero State):** Sem transações no banco, visualizando eixos vazios, sem dados históricos de tendências mensais, cache local vazio. Exposto ao empty state premium da interface.
  - **Steady-State User (Regular User):** Banco de dados populado com transações históricas (>12 meses) cobrindo múltiplas categorias de receitas e despesas. Espera renderização suave, animações e latência de interação de 0ms.
- **Eixo Primário:** `Speed & Latency` (Tempo de renderização inicial, tamanho do bundle, tempo de processamento O(N) das agregações no client thread e latência de reordenação).
- **Eixo Secundário:** `Cognitive Clarity` (Clareza visual das linhas de tendência SVG, legendas Harmoniosas e fidelidade das animações CSS no App Router).

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | Ambas | Solicitação de `/analytics` com checagem de autorização segura em nível de transporte/API. | Consulta direta `.select('*')` à tabela `transactions` sem cláusula `eq('user_id')`. Depende 100% de integridade externa do RLS. | `!=` | Verified | **[BLOCKER]** Risco de segurança por dependência implícita de RLS; sem isolamento de queries explícito. |
| **2** | Ambas | Renderização de Skeleton customizado ultra-rápido (<150ms) mantendo a estrutura dos gráficos. | Spinner genérico centralizado com delay visual total de carregamento enquanto a query inteira O(N) resolve. | `!=` | Verified | Quebra de ritmo visual e sensação de latência no primeiro carregamento. |
| **3** | First-Time | Exibição de empty state elegante com sugestão ou botão de ação rápido para criar transações. | Renderização correta do empty state em container glassmorphic com lucide-react sem botão de call-to-action direto. | `~` | Verified | Atrito de engajamento: o usuário cai em um beco sem saída visual sem botão "Adicionar Transação". |
| **4** | Steady-State | Exibição fluida de KPIs e gráficos com animações sequenciais harmoniosas e trajetórias de SVG precisas. | Gráficos e KPIs renderizados. SVG tem stroke-dasharray estático de 1000px na animação, causando lags ou cortes prematuros se a curva for maior. Animação `@keyframes barGrow` injetada via `<style jsx>` falha silenciosamente se o compilador do Next.js moderno (App Router com SWC) não tiver styled-jsx habilitado. | `!=` | Verified | **[BLOCKER]** Animações de barras quebradas/estáticas devido a styled-jsx e animação SVG com artefato visual. |
| **5** | Steady-State | Ordenação da tabela de categorias instantânea com feedback visual e re-renderização em menos de 16ms. | Re-ordenamento via `useMemo` na CPU cliente. Confortável em bases pequenas, mas gera congelamento da UI (jank) quando o histórico cresce (ex: >5000 transações). | `~` | Inferred | Sensação de lentidão e drop-off com bases de dados corporativas ou de longo prazo devido a CPU-block na main thread. |

---

## 🔬 Detalhamento de Estados por Step

### Step 1: Initial Page Load & Authorization Check
- **Input:** Usuário clica no menu lateral "Relatórios" (`/analytics`) ou digita a URL manualmente.
- **System:** `usePathname()` do Next.js detecta `/analytics` e atualiza a Sidebar. O componente monta, disparando a função `fetchAllTransactions` no `useEffect` inicial.
- **Output:** Tela preta com mesh background translúcido e animação `slideUp` inicial do contêiner principal.
- **Side Effects:** Disparo imediato da requisição HTTP POST/REST para o endpoint Supabase/PostgREST (`/rest/v1/transactions?select=*&order=date.desc`).
- **Backstage:** Verificação do token JWT nos headers pelo gateway do Supabase. O banco de dados Postgres processa as regras de RLS na tabela `transactions`.

### Step 2: Query Execution & React State Mounting
- **Input:** Resolução assíncrona da query de transações pelo Supabase Client.
- **System:** `loading` state definido como `true` no início da query e `false` na finalização (tanto no `success` quanto no `catch`). Array `transactions` populado com os dados recebidos.
- **Output:** Renderização temporária do Spinner central de loading (`animate-spin`).
- **Side Effects:** Gravação no console de erros em caso de falha da query do Supabase.
- **Backstage:** Transferência de payload JSON não compactado de todas as transações cadastradas do usuário via rede TCP.

### Step 3: Zero-State / Empty state representation (First-Time User)
- **Input:** Nenhuma ação direta. Disparado quando `transactions.length === 0` após carregamento.
- **System:** `hasData` avalia como `false`.
- **Output:** Caixa de design premium com efeito blur (`glass`), ícone `BarChart3` em cinza opaco stroke-[1.5], mensagem informativa instruindo o usuário a criar transações.
- **Side Effects:** Sem conexões ativas ou requisições adicionais.
- **Backstage:** Nenhum.

### Step 4: Steady-State dashboard mounting
- **Input:** Nenhuma ação direta. Disparado quando `transactions.length > 0` e `loading === false`.
- **System:** Computação síncrona em cascata na CPU de 4 `useMemo` hooks:
  1. `kpis`: Agrega as transações em `income`, `expense`, `balance` e calcula a `savingsRate`.
  2. `categoryData`: Filtra despesas, totaliza por categoria e calcula percentuais de participação.
  3. `monthlyData`: Agrupa receitas e despesas por mês, classifica cronologicamente e faz o `slice(-12)`.
  4. `sparklinePath`: Desenha os paths SVG para receita e despesa com base em uma escala normalizada contra o valor máximo mensal.
- **Output:**
  - 4 KPI cards renderizados com cores OKLch coordenadas (`text-emerald-400` / `text-red-400`).
  - Bar Chart exibindo as top 8 categorias de despesa com cores Harmoniosas (`categoryColors`).
  - Gráfico Sparkline de tendência mensal desenhando dinamicamente linhas e pontos indicadores de dados.
- **Side Effects:** Nenhum.
- **Backstage:** O navegador processa as animações CSS: `slideUp` do contêiner, `draw` do sparkline SVG (2s de duração) e a animação `@keyframes barGrow` no gráfico de barras.

### Step 5: Table interaction & sorting
- **Input:** Usuário clica no cabeçalho da tabela de Detalhamento por Categoria (ex: clicando em "Transações", "Participação" ou "Total").
- **System:** `handleSort(key)` altera o `sortKey` e o `sortDir` no estado React local. A computação do `sortedCategories` `useMemo` é re-executada instantaneamente.
- **Output:** Atualização da ordem das linhas da tabela de forma reativa. Mudança de cor e rotação dos ícones `ArrowUp` / `ArrowDown` nas colunas selecionadas.
- **Side Effects:** Nenhum.
- **Backstage:** Re-layout das células de tabela no motor Blink/WebKit do navegador.

---

## 👻 Phantom Flows Detectados

Nenhuma rota fantasma diretamente vinculada ao diretório `/analytics`. No entanto, observamos que o componente `Analytics` possui imports redundantes ou inativos:
- O arquivo importa `AlertCircle` de `lucide-react` (linha 12) que nunca é renderizado na tela (código morto).
- O arquivo importa `ChevronRight` (linha 11) usado apenas como elemento visual em cabeçalhos de seções, o qual poderia ser simplificado ou unificado com outros elementos.
- Não existem componentes de relatórios órfãos na pasta `/components`. Toda a lógica do painel está monolítica no arquivo `page.tsx`.

---

## ⚡ Recomendações e Plano de Correção

### 1. Segurança & Robustez da Query (Custo: S)
- **Gargalo:** A consulta Supabase `supabase.from('transactions').select('*')` puxa absolutamente tudo e depende 100% da integridade de configuração de segurança das políticas RLS no banco de dados. Caso o RLS seja desativado acidentalmente em migrações ou scripts de manutenção, os dados de todos os usuários ficarão expostos publicamente.
- **Solução:** Injetar filtro explícito de segurança na query usando o ID da sessão autenticada. Ex:
  ```typescript
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id);
  ```

### 2. Otimização de Performance O(N) e Payload (Custo: L - Recomenda-se Custo M como alternativa)
- **Gargalo:** Puxar todo o histórico de transações para calcular médias e KPIs na CPU do cliente gera gargalos graves em bancos volumosos (alta latência de transferência de payload JSON na rede e estresse da main thread).
- **Solução M (Filtro Temporal):** Limitar a query original apenas aos últimos 12 meses usando um filtro `.gte('date', dataMinima)` na chamada da API. Isso reduz drasticamente o tamanho do payload e a carga computacional das agregações, sem quebrar o gráfico de tendências que de toda forma só exibe os últimos 12 meses.
- **Solução L (Database Aggegation & View):** Criar uma View Materializada ou um RPC no Postgres do Supabase (`get_financial_analytics`) que execute as agregações (KPIs, Categorias e Tendência Mensal) no próprio banco com índices estruturados e retorne um único payload agregado consolidado O(1) de menos de 2KB.

### 3. Correção de Animabilidade e styled-jsx (Custo: S)
- **Gargalo:** A tag `<style jsx>` falha silenciosamente no Next.js App Router moderno se styled-jsx não estiver compilado no SWC. A animação das barras fica estática. Além disso, o SVG usa `stroke-dasharray: 1000` estático na classe `.chart-path` definida em `globals.css` que causa desalinhamentos temporários na animação de desenho da linha.
- **Solução:**
  - Substituir `<style jsx>` por classes utilitárias personalizadas no Tailwind ou inline styles estáticos. Para `@keyframes barGrow`, podemos adicionar a animação no arquivo Tailwind ou usar uma classe inline no Tailwind.
  - Para a animação do Sparkline, calcular o comprimento exato do path programaticamente usando `path.getTotalLength()` via ref no React após montagem para obter transições de traço perfeitamente fluidas e sem lags.

### 4. Melhoria UX de First-Time User (Custo: S)
- **Gargalo:** A tela do Empty State avisa que não há dados, mas não oferece uma ação imediata. O usuário precisa saber como e onde ir para registrar transações.
- **Solução:** Adicionar um botão premium com efeito glassmorphic verde no Empty State direcionando o usuário para `/transactions` (onde há o formulário de inserção) com o texto: "Registrar Minha Primeira Transação".

---

## 🏓 Handoff de Especialistas

- **Para [/hm-ux-flow](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-ux-flow.md):** Analisar a taxa de abandono de usuários novos ao caírem na página de Analytics sem dados e desenhar o onboarding walkthrough interativo.
- **Para [/hm-qa](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-qa.md):** Criar scripts de teste de carga simulando 10.000 transações de entrada para monitorar o tempo de processamento de CPU dos hooks `useMemo` na main thread e a latência de ordenação da tabela.
- **Para [/hm-designer](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-designer.md):** Refinar o visual da linha de tendência SVG. Sugere-se adicionar uma área preenchida com gradiente suave degradê sob a linha de receita e despesa para trazer o design "Stripe-like" com maior impacto tridimensional.
- **Para [/hm-performance](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-performance.md):** Mapear o impacto do carregamento e bundle do Supabase SDK na página de Analytics e validar se a transição para Server Component traria vantagens competitivas no tempo de FCP (First Contentful Paint).
