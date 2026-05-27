---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Investimentos & Patrimônio"
date_created: 2026-05-27
primary_axis: "Cognitive Clarity"
secondary_axis: "Speed & Latency"
blockers_found: 1
phantom_paths_detected: 1
---

# Flow Trace: Investimentos & Patrimônio (Goals & Wealth Accumulation)

Uma análise neural exaustiva, de nível mundial (*world-class*), mapeando a engenharia de UI/UX, arquitetura de dados e fluxos de estado da página de Investimentos do G-Finance.

---

## 📊 Visão Geral do Fluxo

- **Páginas Afetadas:** [/wealth/page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/wealth/page.tsx)
- **Persona Analisada:** First-Time User (Zero State) vs Steady-State User (Regular User)
- **Eixo Primário:** Cognitive Clarity (Clareza visual, editoria editorial, legibilidade da alocação de metas)
- **Eixo Secundário:** Speed & Latency (Carregamento das metas do Supabase, renderização matemática e animações do Donut SVG)

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | Ambas | Acesso à rota `/wealth` com esqueleto de carregamento premium (*shimmer skeleton*). | Tela preta com spinner circular básico de rotação crua (`animate-spin`) por 300-800ms. | `~` | Verified | Baixa sofisticação visual no carregamento inicial, quebrando a estética editorial. |
| **2** | First-Time | Visualização elegante de "Empty State" com botão direto para criar metas via modal ou painel. | Exibe card estático informando para cadastrar metas "nos Ajustes", mas **sem links** ou botões. | `!=` | Verified | **[BLOCKER]** A página de Ajustes não possui nenhuma UI para gerenciar metas. Fluxo órfão absoluto. |
| **3** | Steady-State | Donut de alocação de patrimônio animado preenchendo suavemente com cores premium e sombras suaves. | O gráfico de Donut SVG calcula os segmentos dinamicamente e faz transição de preenchimento suave de 1s. | `=` | Verified | Correspondência impecável. Altíssimo padrão estético com ambient glow. |
| **4** | Steady-State | Cards individuais de metas mostrando progresso em BRL e barra de progresso horizontal sincronizada. | Cards de meta renderizados em grid 2x2 com barras de progresso animadas e cálculos corretos de valores restantes. | `=` | Verified | Excelente resposta visual e legibilidade dos dados. |
| **5** | Steady-State | Visualização consolidada inferior em 3 blocos (Total, Faltam, Média) com barra de progresso global. | Exibe grid estatístico de 3 colunas correto com progresso médio da carteira ponderado de forma aritmética simples. | `~` | Verified | Progresso médio aritmético simples trata todas as metas com pesos iguais, sem ponderar pelo valor da meta. |

---

## 🔬 Detalhamento de Estados por Step

### Step 1: Carregamento Assíncrono (Loading State)
- **Input:** Acesso direto ou redirecionamento à rota `/wealth`.
- **System:** `loading = true`, inicia a busca concorrente dos dados do usuário logado e sua respectiva lista de metas da tabela `goals` no Supabase.
- **Output:** Spinner central animado em verde-esmeralda em tela de fundo escuro:
  ```tsx
  <div className="flex-1 flex justify-center items-center h-full bg-slate-950">
    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500"></div>
  </div>
  ```
- **Side Effects:** Disparo sequencial assíncrono:
  1. `supabase.auth.getUser()` para recuperar dados de segurança e UUID do usuário ativo.
  2. `supabase.from('goals').select('*').eq('user_id', user.id)` para buscar as metas.
- **Backstage:** Execução da query SELECT no banco de dados PostgreSQL do Supabase filtrada pela coluna indexada `user_id`.

---

### Step 2: Renderização Empty State (First-Time User)
- **Input:** Retorno da API com array vazio (`[]`) de metas.
- **System:** `loading = false`, `goals = []`, as estatísticas derivadas recalculadas via `useMemo` avaliam para zero (`totalInvested = 0`, `totalTarget = 0`, `remainingToGoal = 0`, `averageProgress = 0`).
- **Output:** Card central em estilo glassmorphism (`bg-slate-900/40 border-white/5`) contendo ícone de `Target` em verde esmeralda com opacidade de 10% e o seguinte microcopy:
  > *"Defina seus objetivos de crescimento patrimonial nos Ajustes para começar a acompanhar seu progresso."*
- **Side Effects:** Nenhum.
- **Backstage:** Nenhum.
- **Divergência Crítica:** O microcopy instrui o usuário a ir para os "Ajustes", mas não existe interface física de CRUD de metas em `/settings` ou em qualquer outra página! O gerenciamento de metas é feito exclusivamente via chat de IA.

---

### Step 3: Donut Chart Neural Ring System (Steady-State)
- **Input:** Carregamento de metas populadas (ex: Reserva de Emergência, Viagem, etc.) com aportes financeiros ativos (`current_amount > 0`).
- **System:** `loading = false`, `goals` populados. O componente [DonutChart](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/wealth/page.tsx#L56-L139) calcula a proporção de cada meta sobre o montante consolidado de investimentos.
- **Geometria de Segmentação do SVG:**
  - **Raio ($r$):** `80`
  - **Circunferência ($C$):** $2 \cdot \pi \cdot r \approx 502.65$
  - **Algoritmo de Offsets Acumulados:**
    ```typescript
    const total = goals.reduce((s, g) => s + g.current_amount, 0);
    let cumulativeOffset = 0;
    
    // Para cada meta:
    const fraction = goal.current_amount / total;
    const segmentLength = circumference * fraction;
    const gapSize = goals.length > 1 ? 4 : 0;
    const adjustedSegment = Math.max(segmentLength - gapSize, 1);
    const dashArray = `${adjustedSegment} ${circumference - adjustedSegment}`;
    const dashOffset = -(cumulativeOffset + gapSize / 2);
    cumulativeOffset += segmentLength;
    ```
  - **Transformada de Rotação:** O círculo é rotacionado em `-90` graus (`rotate(-90 100 100)`) para forçar o início de desenho vertical às 12 horas, girando em sentido horário.
- **Output:** Gráfico circular de alta fidelidade visual com sombras projetadas dinamicamente (`style={{ filter: 'drop-shadow(0 0 6px ${color}40)' }}`) e anéis coloridos de forma independente de acordo com o palette de cores configurado. No centro, exibe a contagem consolidada de metas.
- **Side Effects:** Nenhum.

---

### Step 4: Cards Individuais de Progresso & Metas (Steady-State)
- **Input:** Visualização e navegação pela tela.
- **System:** Renderização iterativa de `goals.map()`. O cálculo de percentual individual é realizado de forma segura:
  ```typescript
  const percentage = Math.min(
    Math.round((goal.current_amount / goal.target_amount) * 100),
    100
  );
  ```
- **Output:** Cards individuais estilizados com bordas sutis `border-white/5` que intensificam para `border-white/10` sob estado de `:hover`. A barra de progresso horizontal preenche sua largura dinamicamente de acordo com o percentual calculado, animando suavemente em 1s (`transition-all duration-1000`).
- **Side Effects:** Nenhum.

---

## 👻 Phantom Flows Detectados

- **Criação e Gestão de Metas Inexistente em UI Física:** A tela de Ajustes ([settings/page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/settings/page.tsx)) não possui qualquer elemento ou formulário para manipulação das metas da tabela `goals`. 
- **Conexão Fantasma via IA:** O usuário só consegue realizar CRUD de metas conversando diretamente com a inteligência artificial no chat lateral (`src/lib/gemini.ts` com as ferramentas `create_user_goal`, `update_user_goal`, `delete_user_goal`, `list_user_goals`). A interface visual é puramente passiva (leitura), sem dar ao usuário uma rota física direta de edição.
- **Desaparecimento Completo do Donut Chart:** Se a soma de todos os aportes atuais (`current_amount`) for R$ 0, o componente `DonutChart` retorna `null` e some inteiramente da interface. Isso acontece mesmo se existirem várias metas configuradas (com alvos maiores que 0), gerando um "buraco visual" na área superior direita do card principal.

---

## ⚡ Recomendações e Plano de Correção

| Categoria | Gargalo / Fricção Identificada | Solução Proposta | Custo (S/M/L) |
| :--- | :--- | :--- | :--- |
| **UI/UX / Blocker** | Falha de Roteamento em Ajustes / Falta de CRUD Físico | Desenvolver um botão "Nova Meta" e um modal estilizado em vidro de alocação física diretamente no dashboard de investimentos `/wealth`, permitindo criar metas sem depender do chatbot. | **M** |
| **Aesthetics** | Spinner cru (`animate-spin`) quebra padrão editorial | Substituir o spinner central por um *Shimmer Skeleton Loader* de alta fidelidade que replica a silhueta do Donut e dos cards inferiores durante o carregamento inicial. | **S** |
| **UI/UX** | Desaparecimento do Donut quando aportes zerados | Modificar o `DonutChart` para renderizar uma versão cinza com traço tracejado estilizado (`stroke-dasharray="4, 4"`) representando o "Alvo Geral Desejado" em vez de retornar `null`. | **S** |
| **Math / Performance** | Média aritmética simples de progresso | Ajustar a fórmula do progresso global para uma média ponderada baseada no peso de cada alvo (`target_amount`), oferecendo um retrato fiel do patrimônio. | **S** |
| **Core Integration** | Slider de Projeção Patrimonial com Juros Compostos | Implementar um simulador interativo na parte inferior da página permitindo estimar o crescimento do patrimônio com aportes recorrentes e taxas de juros simuladas. | **M** |

---

## 🏓 Handoff de Especialistas

- **Para [/hm-ux-flow](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-ux-flow.md):** Analisar a jornada cognitiva do usuário ao descobrir que precisa usar o Chat de IA para criar metas patrimoniais, medindo a retenção desse fluxo.
- **Para [/hm-designer](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-designer.md):** Criar os mockups para o modal físico de criação de metas, usando tipografia Outfit, sombras atômicas em OKLch e layout dark-first.
- **Para [/hm-engineer](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-engineer.md):** Otimizar a query de leitura de metas adicionando paginação leve e verificando as regras de Supabase RLS da tabela `goals` para garantir segurança a nível de linha contra injeções de UUIDs de terceiros.
- **Para [/hm-qa](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-qa.md):** Validar o cálculo geométrico do Donut sob situações extremas (ex: 20 metas simultâneas, divisões fracionárias infinitesimais para evitar sobreposição de segmentos ou quebras de renderização do SVG).
