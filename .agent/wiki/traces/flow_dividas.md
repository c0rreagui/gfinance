---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Dívidas (Debts Management)"
date_created: 2026-05-27
primary_axis: "Cognitive Clarity"
secondary_axis: "Speed & Latency"
blockers_found: 1
phantom_paths_detected: 0
---

# Flow Trace: Dívidas (Debts Management)

Auditando o fluxo neural de controle de passivos, alertas de vencimento e cronologia de quitação em [src/app/debts/page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/debts/page.tsx).

---

## 📊 Visão Geral do Fluxo

O módulo de **Controle de Dívidas** da G-Finance centraliza a visualização e gestão de passivos pendentes de um usuário. O sistema realiza cálculos em tempo real de progressão temporal, distribuição de urgência de pagamento e cronograma vertical para mitigar a ansiedade financeira e prover clareza editorial.

- **Páginas Afetadas:** [/debts](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/debts/page.tsx)
- **Personas Analisadas:**
  - **First-Time User (Zero State):** Sem compromissos ou passivos cadastrados no banco de dados. Visualiza o estado de saúde financeira impecável com um design em glassmorphism.
  - **Steady-State User (Regular User):** Sessão ativa com múltiplos compromissos ativos na tabela `reminders` com a flag `paid: false`. Visualiza estatísticas de passivos, cards informativos e timeline de projeção.
- **Eixo Primário:** **Cognitive Clarity** (Legibilidade rápida da exposição a passivos e urgência temporal)
- **Eixo Secundário:** **Speed & Latency** (Minimizar tempo de carregamento no carregamento de dados e otimização de queries Postgres)

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | Ambas | O usuário acessa a página e visualiza loaders customizados e harmoniosos com a estética editorial dark-first da plataforma. | Exibe um spinner circular simples (`animate-spin`) centralizado na tela. | `~` | Verified | O spinner destoa da sofisticação visual das demais telas (Airbnb/Linear spec). |
| **2** | First-Time | Renderiza um painel informativo minimalista, acolhedor e com ilustrações ou ícones suaves indicando ausência de passivos. | Exibe uma bela seção glassmorphism com o ícone `Shield` verde, título "Nenhuma dívida registrada" e texto motivacional. | `=` | Verified | Nenhuma fricção identificada; design e cópia impecáveis. |
| **3** | Steady-State | Exibe estatísticas de compromissos agregados em tempo real (Total, Parcelas do Mês e Previsão de Quitação). | Renderiza três Stat Cards com efeito de vidro e gradiente radial de fundo (`emerald-500/10`). Provisão de dados precisa. | `=` | Verified | Nenhuma fricção; o cálculo e formatação monetária (BRL) estão corretos. |
| **4** | Steady-State | O usuário visualiza cada dívida com uma barra de progresso indicando o tempo decorrido do contrato e badges de urgência. | Renderiza lista com badges dinâmicos (`high`/`medium`/`low`) e progressão temporal em porcentagem. | `!=` | Inferred | **[BLOCKER]** A ausência de botões de controle ("Marcar como Pago" ou "Editar") força o usuário a usar o chatbot de IA para atualizar dados, criando gargalos operacionais sérios. |
| **5** | Steady-State | Exibe um alerta visual claro de "Atrasado" para compromissos cuja data limite expirou baseado no dia corrido. | O cálculo de atraso `dueDate < new Date()` compara data/hora local. Pode exibir aviso de "Atrasado" precocemente por timezone. | `~` | Inferred | Falsos alertas de atraso devido ao drift de horas na comparação estática. |
| **6** | Steady-State | Apresenta uma timeline vertical dinâmica listando as próximas 6 parcelas futuras de forma cronológica. | Timeline renderizada com sucesso, contendo nós esféricos customizados com a cor da urgência e realce cintilante no primeiro nó. | `=` | Verified | Layout fluido e alinhado com o mais alto padrão. |

---

## 🔬 Detalhamento de Estados por Step

### Step 1: Carregamento e Autenticação (Skeleton State)
- **Input:** Entrada do usuário na rota `/debts` via clique na [Sidebar.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/components/Sidebar.tsx).
- **System:** React monta o componente `DebtsPage`, definindo `loading = true` e disparando o hook `useEffect`.
- **Output:** Spinner giratório centralizado na cor verde-esmeralda em fundo slate escuro (`bg-slate-950`).
- **Side Effects:**
  - Consulta ao Supabase Auth: `const { data: { user } } = await supabase.auth.getUser()`.
  - Chamada à tabela `reminders` do banco de dados: `.from('reminders').select('*').eq('user_id', user.id).eq('paid', false).order('due_date', { ascending: true })`.
- **Backstage:** O Postgres executa um escaneamento sequencial (Sequential Scan) se não houver um índice específico otimizado para `(user_id, paid)`.

### Step 2: Estado Vazio (Zero State)
- **Input:** Retorno da API/Supabase com dados vazios `[]`.
- **System:** Hook `useEffect` define `setDebts([])` e `setLoading(false)`. Os hooks `useMemo` de agregação financeira retornam valores padrões (`totalDebt = 0`, `installmentsThisMonth = 0`, `projectedClearDate = '—'`).
- **Output:** Renderização do card centralizado em vidro jateado com bordas semitransparentes, contendo o ícone `Shield` em verde.
- **Side Effects:** Nenhuns.
- **Backstage:** Nenhum consumo de recursos assíncronos adicionais.

### Step 3: Painel Principal & Derivação Neural (Steady-State)
- **Input:** Retorno da API com múltiplos registros de dívidas ativas.
- **System:** `setDebts(data)` define o estado e desativa o loading (`setLoading(false)`). Três computações ocorrem em hooks `useMemo`:
  - **`totalDebt`**: Soma acumulada do valor absoluto de cada débito:
    ```typescript
    debts.reduce((sum, d) => sum + Math.abs(d.amount), 0)
    ```
  - **`installmentsThisMonth`**: Filtra dívidas vencendo no mês/ano correntes:
    ```typescript
    debts.filter((d) => {
      const due = new Date(d.due_date);
      return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
    }).length
    ```
  - **`projectedClearDate`**: Reduz a lista de dívidas para encontrar a com maior data de vencimento (`due_date`) e formata apenas o mês abreviado e ano (ex: `"dez. de 2026"`):
    ```typescript
    const latest = debts.reduce((max, d) => new Date(d.due_date) > new Date(max.due_date) ? d : max);
    ```
- **Output:** Exibição imediata dos três Stat Cards de topo, lista scrollável "Dívidas Ativas" e timeline cronológica de pagamentos futuros.
- **Side Effects:** Nenhuns.
- **Backstage:** Cache local re-hidratado na memória do browser.

### Step 4: Urgência e Progressão Temporal (Time Progress)
- **Input:** Renderização da lista de dívidas no cliente.
- **System:** Para cada item, o componente invoca `getTimeProgress(debt.created_at, debt.due_date)` e mapeia os estilos baseados no campo `urgency` (`'high' | 'medium' | 'low'`) definido em `urgencyConfig`:
  - Se `end <= start` (vencimento anterior ou igual à data de criação), retorna `100%`.
  - Caso contrário, calcula a porcentagem linear decorrida do tempo contratado da dívida em relação à data atual:
    ```typescript
    const elapsed = now - start;
    const total = end - start;
    return Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
    ```
- **Output:** Barra de progresso visual com preenchimento colorido que acompanha a gravidade da dívida:
  - **Urgente (`high`):** Bar vermelho (`bg-red-500`), badge vermelho (`text-red-400`), ícone `AlertTriangle`.
  - **Moderado (`medium`):** Bar amarelo (`bg-amber-500`), badge amarelo (`text-amber-400`), ícone `Clock`.
  - **Tranquilo (`low`):** Bar verde (`bg-emerald-500`), badge esmeralda (`text-emerald-400`), ícone `CheckCircle2`.
  - **Overdue Indicator:** Texto vermelho vibrante `• Atrasado` adjacente ao vencimento se o timestamp atual for posterior ao vencimento.
- **Side Effects:** Nenhuns.

### Step 5: Visualização da Timeline de Pagamentos
- **Input:** Interação passiva do usuário navegando na coluna da direita.
- **System:** Computa `timeline` memoizado limitando a exibição às próximas 6 parcelas que possuem data de vencimento igual ou superior à data de montagem do componente.
- **Output:** Renderização de uma timeline vertical premium com uma linha guia cinza fosco (`bg-white/5`), contendo círculos de cor correspondentes à urgência da dívida. A primeira parcela (a mais próxima no tempo) recebe um anel esmeralda expandido (`ring-4 ring-emerald-500/20`) para sinalizar foco prioritário de atenção.
- **Side Effects:** Nenhuns.

---

## 👻 Phantom Flows Detectados

- **Sem Rotas Fantasmas Identificadas:** A página `/debts` está devidamente referenciada na [Sidebar.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/components/Sidebar.tsx#L34).
- **Tráfego Órfão / Fluxo Fantasma:** A página é unicamente de **leitura estática**. Não há nenhuma rota de criação, edição ou remoção via UI convencional na pasta `/debts`. Toda a mutação de dados é injetada indiretamente por meio do chat interativo do [Gemini Brain](/gemini) ou via banco de dados diretamente. Isso gera um "Phantom Input", onde a interface induz o usuário a pensar que a página é interativa, mas ela é 100% de leitura passiva.

---

## ⚡ Recomendações e Plano de Correção

| Categoria | Gargalo / Fricção Identificada | Solução Proposta | Custo (S/M/L) |
| :--- | :--- | :--- | :--- |
| **UX/UI** | Falta de controle direto para quitar dívidas na interface convencional. | Adicionar um botão discreto de ação rápida no card da dívida (ex: ícone de Check) para liquidar o compromisso. Ao clicar, executa a mutação Supabase e retira o item da lista com animação suave de fadeout. | **M** |
| **Performance** | Possível lentidão de consulta em base de dados com volume massivo de reminders. | Criar um índice composto no Postgres nas colunas cruciais da query: `(user_id, paid, due_date ASC)` para agilizar a leitura. <br> `CREATE INDEX idx_reminders_user_paid_due ON reminders (user_id, paid, due_date ASC);` | **S** |
| **Resilience** | Fallback arbitrário de 30 dias para progresso caso `created_at` seja nulo. | Substituir o fallback estático de 30 dias por uma lógica condicional: se `created_at` for nulo, omitir a barra de progresso temporal para evitar a exibição de dados errôneos baseados em falsas premissas. | **S** |
| **UX/UI** | Spinner de carregamento padrão e sem personalidade visual. | Substituir a animação padrão por um shimmer skeleton premium e glassmorphic no layout exato dos cards para evitar quebras visuais bruscas (Layout Shifts). | **S** |
| **Estabilidade** | Margem de erro e falso-positivo para alertas de atraso devido a fuso horário. | Normalizar a comparação de datas usando o dia de vencimento truncado para meia-noite (UTC ou local do cliente) em vez de timestamps brutos, garantindo alertas precisos. | **S** |

---

## 🏓 Handoff de Especialistas

- **Para [/hm-ux-flow](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-ux-flow.md):** Analisar a taxa de drop-off e abandono de usuários que chegam na página e não encontram o botão de adição de dívidas convencional (estudo de atrito cognitivo em fluxo de leitura).
- **Para [/hm-qa](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-qa.md):** Criar casos de teste cobrindo a renderização com fusos horários extremos (ex: GMT-3 vs GMT+1) para verificar se o badge de `• Atrasado` se comporta de forma idêntica.
- **Para [/hm-designer](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-designer.md):** Prototipar o loader glassmorphic e o botão de ação rápida "Marcar como Pago" seguindo os princípios de estética editorial da Stripe e Airbnb.
- **Para [/hm-performance](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-performance.md):** Avaliar a viabilidade de implementar paginação (infinite scroll) ou cursor pagination na listagem de dívidas caso o banco do usuário ultrapasse 100 reminders ativos.
