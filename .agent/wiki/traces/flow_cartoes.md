---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Cartões (Credit Cards & Limits)"
date_created: 2026-05-27
primary_axis: "Cognitive Clarity"
secondary_axis: "Resilience & Recovery"
blockers_found: 2
phantom_paths_detected: 0
---

# Flow Trace: Cartões (Credit Cards & Limits)

## 📊 Visão Geral do Fluxo

O módulo de **Cartões** (`/cards`) do G-Finance é concebido como um centro de comando financeiro premium, combinando sofisticação visual de alto impacto (estética *Dark-First*, *glassmorphism*, e simulação tridimensional de cartão físico) com ferramentas interativas de controle de crédito. O trace analisa a transição de estado da interface em duas jornadas de usuário e mapeia discrepâncias críticas entre o fluxo especificado e o comportamento real do código.

- **Páginas Afetadas:** [page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/cards/page.tsx)
- **Personas Analisadas:** First-Time User (Zero State) & Steady-State User (Regular User)
- **Eixo Primário:** `Cognitive Clarity` (Clareza editorial e ausência de ruído nos dados de limite)
- **Eixo Secundário:** `Resilience & Recovery` (Persistência e tolerância a falhas na interação de limites)

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | First-Time | Acessa a rota `/cards` e vê o limite de R$ 0,00 utilizado, limite disponível total de R$ 25.000,00 e feed de transações zerado com *empty state* elegante. | Acessa a rota, exibe o spinner por ~300ms. Renderiza *empty state* na lista de transações, mas mostra **R$ 8.244,70** de fatura atual e **R$ 16.755,30** de limite disponível! | `!=` | Verified | **[BLOCKER]** Altíssima ansiedade cognitiva. O usuário vê uma dívida de R$ 8k que nunca realizou devido a um *hardcoded fallback* no código do cliente. |
| **2** | Steady-State | Acessa a rota `/cards`, visualiza skeletons premium e depois renderiza a fatura agregada real calculada do banco de dados e suas últimas 10 transações de cartão. | Exibe spinner, depois calcula a fatura somando todas as transações `'Cartão'` no cliente via Supabase. Renderiza o feed de transações e a barra de limite com dados dinâmicos. | `~` | Verified | Mudança abrupta de layout (layout shift) entre o carregamento e a renderização final dos valores dinâmicos. |
| **3** | Ambos | Clica no botão de "olho" no cartão físico para revelar os dados confidenciais do cartão sem causar distorções tipográficas. | Toggles `showCardNumber` de `false` para `true`. O número muda instantaneamente, mas causa um leve "salto" de largura na fonte devido à diferença de tamanho entre `••••` e caracteres mono normais. | `~` | Verified | Pequeno descompasso visual (jitter tipográfico) em telas mobile. |
| **4** | Ambos | Arrasta o controle deslizante de limite (Slider) e ajusta o limite de crédito real. O valor atualizado é salvo imediatamente no perfil do usuário. | O slider de range altera o estado local `cardLimit` de forma fluida. O percentual da barra atualiza em tempo real, porém o valor **não é persistido** no banco de dados ou no `localStorage`. | `!=` | Verified | **[BLOCKER]** Perda de dados. Se o usuário recarregar a página ou navegar para outra tela, seu limite customizado reseta para R$ 25.000,00. |
| **5** | Ambos | Utiliza filtros interativos na barra lateral de lançamentos recentes (busca por termo, filtro por valor e categoria secundária). | O feed de transações exibe a mensagem "Filtrado por compras no cartão", mas o filtro é **estático e hardcoded** na query de banco. Não existe UI para filtros interativos. | `!=` | Inferred | Frustração funcional. O usuário tenta interagir ou buscar lançamentos e percebe que o painel é estático. |

---

## 🔬 Detalhamento de Estados por Step

### Step 1: Initial Render & SSR (First-Time User vs Steady-State)
- **Input:** Navegação direta do usuário para `d:\APPS - ANTIGRAVITY\G-Finance\src\app\cards\page.tsx`.
- **System:** 
  - Inicialização dos estados React:
    ```typescript
    const [showCardNumber, setShowCardNumber] = useState(false);
    const [cardLimit, setCardLimit] = useState(25000);
    const [usedLimit, setUsedLimit] = useState(8244.70); // HARDCODED FALLBACK!
    const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    ```
  - Execução imediata do `useEffect` chamando `fetchCardData()`.
- **Output:** A tela renderiza a estrutura completa com gradiente de fundo esmeralda (`bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(255,255,255,0))]`) e o cartão "G-Black" físico no estado fechado (oculto).
- **Side Effects:** Nenhuma chamada no servidor (Static Route Shell), mas inicia a conexão do Supabase no cliente.
- **Backstage:** Nenhum.

---

### Step 2: Database Fetching & Aggregation Waterfall
- **Input:** Trigger automático do ciclo de vida React (`useEffect`).
- **System:**
  - O cliente inicia duas chamadas assíncronas concorrentes para a tabela de transações do Supabase:
    1. Busca as últimas 10 transações categorizadas como 'Cartão':
       ```typescript
       supabase.from('transactions').select('*').eq('category', 'Cartão').order('date', { ascending: false }).limit(10)
       ```
    2. Busca o montante de **todas** as transações categorizadas como 'Cartão' para realizar a soma cumulativa no cliente:
       ```typescript
       supabase.from('transactions').select('amount').eq('category', 'Cartão')
       ```
  - Processamento do limite:
    ```typescript
    const sum = allTxs.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    if (sum > 0) setUsedLimit(sum);
    ```
    *Nota Arquitetural Crítica:* Se a tabela de transações estiver vazia (`sum === 0`), a função nunca chama `setUsedLimit(sum)`, fazendo com que o estado local permaneça com a constante estática `8244.70`.
- **Output:** O spinner de carregamento no painel de transações some (`loading = false`). A fatura atual e o limite disponível mudam de valor subitamente dependendo da soma dos valores dinâmicos retornados.
- **Side Effects:** 2 chamadas de leitura (SELECT queries) na base de dados PostgreSQL do Supabase.
- **Backstage:** Varredura completa da tabela (`Seq Scan`) no Supabase para buscar `amount` se não houver um índice específico na coluna `category`.

---

### Step 3: Card Number Eye Reveal Toggle
- **Input:** Clique do usuário no botão `<button onClick={(e) => { e.stopPropagation(); setShowCardNumber(!showCardNumber); }}>` contido na representação visual do cartão.
- **System:**
  - O estado local do React `showCardNumber` muda de `false` para `true` (ou vice-versa).
- **Output:**
  - O componente re-renderiza o número do cartão alternando entre as strings:
    - `showCardNumber === false`: `"•••• •••• •••• 9912"`
    - `showCardNumber === true`: `"4290 8812 3456 9912"`
  - O ícone muda de `<Eye className="w-4 h-4" />` para `<EyeOff className="w-4 h-4" />`.
  - Escala tridimensional do cartão é mantida via transição suave CSS (`hover:scale-[1.02] transition-all duration-500`).
- **Side Effects:** Nenhum.
- **Backstage:** Nenhum.

---

### Step 4: Interactive Limits Adjustment Slider
- **Input:** Usuário arrasta o `<input type="range" min="10000" max="100000" step="5000" ... />`.
- **System:**
  - O manipulador `onChange` dispara `setCardLimit(Number(e.target.value))`.
  - Recálculo dinâmico das variáveis computadas:
    ```typescript
    const availableLimit = cardLimit - usedLimit;
    const limitPercentage = (usedLimit / cardLimit) * 100;
    ```
- **Output:**
  - A barra horizontal de progresso do limite (`style={{ width: `${limitPercentage}%` }}`) se contrai ou expande instantaneamente devido à diretiva de transição do Tailwind (`transition-all duration-300`).
  - O letreiro "Atual: R$ [cardLimit]" é atualizado dinamicamente.
  - O valor de "Limite Disponível (R$)" reflete a nova margem de crédito em tempo real com formatação monetária local brasileira.
- **Side Effects:** Nenhum. **Não há gravação no banco de dados Supabase nem no localStorage.**
- **Backstage:** Mudança puramente contida na árvore de renderização virtual do React (V-DOM).

---

## 👻 Phantom Flows Detectados

Não foram detectadas rotas órfãs ou arquivos fantasmas diretamente sob `/cards`. O arquivo de rotas está devidamente integrado ao painel principal do G-Finance. Entretanto, existem lacunas funcionais severas:
- **Ausência de Rota de POST de Ajuste de Limite:** Não existe um endpoint ou trigger de banco de dados para salvar a preferência de limite do usuário.
- **Falta de Feedback do Titular:** O nome do titular "Guilherme C. S. P." está estático no código (`line 146`), ignorando os dados reais do usuário autenticado no Supabase Auth.

---

## ⚡ Recomendações e Plano de Correção

Para elevar a página de cartões ao padrão *World-Class* exigido, propomos as seguintes correções arquiteturais categorizadas por custo:

### 1. Correção do Bug de Fatura do Primeiro Usuário (Zero-State Bug)
- **Gargalo:** O usuário sem transações visualiza uma fatura fantasma de R$ 8.244,70 porque o estado inicial nunca é sobrescrito quando a query retorna vazia.
- **Solução:** Alterar o estado padrão do `usedLimit` para `0` e atualizar o efeito colateral para forçar a sincronização de qualquer valor (inclusive `0`).
- **Código Proposto:**
  ```typescript
  // Altera o estado inicial para 0
  const [usedLimit, setUsedLimit] = useState(0);

  // E no useEffect, remove a restrição de sum > 0
  if (allTxs) {
    const sum = allTxs.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    setUsedLimit(sum); // Sincroniza sempre, mesmo se sum for 0
  }
  ```
- **Custo:** **S** (Ajuste lógico imediato, <15min)

---

### 2. Otimização de Performance e Latência de Agregação (N+1 Client Scan)
- **Gargalo:** O cliente executa um `SELECT amount` irrestrito no banco de dados para somar no lado do cliente. Se o usuário possuir milhares de transações, isso causará lentidão crítica, gargalo de rede e alto custo operacional no Supabase.
- **Solução:** Criar uma função de agregação otimizada no PostgreSQL via Supabase RPC (Remote Procedure Call) ou realizar um `SELECT SUM(amount)` direto usando as capacidades agregadoras do Postgres, evitando trafegar dados brutos pela rede.
- **Código Proposto:**
  ```sql
  -- Criação de uma RPC otimizada no Postgres
  CREATE OR REPLACE FUNCTION get_card_invoice_sum(user_uuid UUID)
  RETURNS NUMERIC AS $$
  BEGIN
    RETURN COALESCE(
      (SELECT SUM(ABS(amount)) 
       FROM public.transactions 
       WHERE user_id = user_uuid AND category = 'Cartão'), 
      0
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
  E no cliente:
  ```typescript
  const { data: sum, error } = await supabase.rpc('get_card_invoice_sum');
  if (!error && sum !== null) setUsedLimit(Number(sum));
  ```
- **Custo:** **M** (Refatoração de banco de dados e implementação de segurança RLS na RPC, 3h)

---

### 3. Persistência de Limite Customizado (State Synchronizer)
- **Gargalo:** A alteração do slider de limite é volátil e some no F5.
- **Solução:** Implementar um mecanismo híbrido de sincronização: salvamento instantâneo em `localStorage` para resposta instantânea otimista, com um *debouced dispatch* persistindo o valor no banco Supabase (tabela `profiles` ou tabela `user_preferences`).
- **Código Proposto:**
  ```typescript
  // Inicialização a partir do localStorage para evitar flickering
  const [cardLimit, setCardLimit] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('g_finance_card_limit');
      return saved ? Number(saved) : 25000;
    }
    return 25000;
  });

  // Efeito para persistência e debounce
  useEffect(() => {
    localStorage.setItem('g_finance_card_limit', cardLimit.toString());
    
    const handler = setTimeout(async () => {
      // Sincroniza com Supabase para resiliência multi-device
      await supabase
        .from('profiles')
        .update({ card_limit: cardLimit })
        .eq('id', currentUser.id);
    }, 1000); // 1s Debounce para evitar sobrecarga de requisições de escrita

    return () => clearTimeout(handler);
  }, [cardLimit]);
  ```
- **Custo:** **M** (Configuração de persistência e tratamento de estados assíncronos, 4h)

---

### 4. Filtros Dinâmicos no Feed de Lançamentos Recentes
- **Gargalo:** O letreiro indica que o feed está filtrado, mas a interface não dá opção ao usuário.
- **Solução:** Inserir um input de busca inline premium e um pequeno seletor de range de valor no cabeçalho do painel de transações, filtrando o estado `cardTransactions` localmente no cliente.
- **Custo:** **S** (Tratamento simples de array de estado local no cliente, 2h)

---

## 🏓 Handoff de Especialistas

- **Para [hm-ux-flow](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-ux-flow.md):** Analisar a atração psicológica do Slider de Ajuste de Limite. A resposta visual imediata da barra de limite em HSL/OKLch está perfeitamente alinhada com as referências da Stripe, mas a ausência de um botão claro de "Confirmar Novo Limite" pode dar a falsa impressão de que a ação não foi concluída.
- **Para [hm-qa](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-qa.md):** Criar casos de teste automatizados para simular latência de rede no carregamento assíncrono das transações de cartão e assegurar que a UI não sofra com *race conditions* no cálculo dinâmico da fatura.
- **Para [hm-designer](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-designer.md):** Validar a transição tipográfica mono-espaçada dos numerais do cartão de crédito G-Black para suavizar o descompasso geométrico ao revelar o número do cartão (utilizar uma fonte como *JetBrains Mono* ou *DM Mono* com largura fixa estrita).
- **Para [hm-performance](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-performance.md):** Medir o impacto do client-side `reduce` em cenários com >500 transações de cartão e assegurar a indexação correta da coluna `category` no PostgreSQL.
