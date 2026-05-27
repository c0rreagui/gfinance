---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Transações (Transactions List)"
date_created: 2026-05-27
primary_axis: "Speed & Latency"
secondary_axis: "Conversion"
blockers_found: 3
phantom_paths_detected: 1
---

# Flow Trace: Transações (Transactions List)

## 📊 Visão Geral do Fluxo

O módulo de **Transações** (`/transactions`) do G-Finance é o núcleo operacional da plataforma, responsável pelo registro histórico e manual do fluxo de caixa (receitas e despesas). Ele foi arquitetado para oferecer visualização instantânea de lançamentos recentes e um painel de inserção rápida via modal glassmórfico. 

Este trace realiza uma auditoria rigorosa do comportamento do código de listagem, dos filtros em tempo de execução, e da integridade transacional das operações, revelando lacunas críticas de persistência distribuída e eficiência computacional.

- **Páginas Afetadas:** [page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/transactions/page.tsx)
- **Componentes e Utilitários Relacionados:** [reconcile.ts](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/lib/reconcile.ts) | [init_schema.sql](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/supabase/migrations/20260525000000_init_schema.sql)
- **Personas Analisadas:** First-Time User (Zero State) & Steady-State User (Regular User)
- **Eixo Primário:** `Speed & Latency` (Escalabilidade de leitura e gargalos de processamento client-side)
- **Eixo Secundário:** `Conversion` (Atratividade, fricção no onboarding de novos dados e integridade dos saldos)

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | First-Time | Acessa a rota `/transactions` e visualiza um *empty state* intuitivo e ilustrativo, sugerindo a criação da primeira transação ou importação de extrato. | Exibe spinner por ~200ms, em seguida renderiza o painel principal com texto: *"Nenhuma transação encontrada para a busca atual."* e botão cinza *"Limpar Busca"*. | `!=` | Verified | **Fricção de Boas-Vindas.** A tela inicial de um usuário sem dados parece um erro de busca ou um estado quebrado, sem guiar o onboarding. |
| **2** | Steady-State | Acessa a rota, vê skeletons elegantes e carrega de forma paginada e rápida as últimas 20 transações, realizando buscas server-side otimizadas. | Carrega **toda a base histórica** sem paginação em um único fetch. Realiza filtro de busca exclusivamente via array JavaScript em memória no navegador. | `!=` | Verified | **[BLOCKER] Latência Crítica.** Usuários avançados com milhares de transações sofrerão com alto consumo de rede (payload excessivo) e lag de renderização. |
| **3** | Ambos | Abre o modal "Nova Transação", seleciona a categoria e o ícone correspondente é sugerido ou unificado automaticamente no formulário. | O usuário é obrigado a fazer duas seleções manuais: uma para a Categoria textual e outra para o Ícone Lucide. As listas não se integram no front-end. | `~` | Verified | **Divergência Visual.** Usuários podem salvar uma transação de "Salário" associando um ícone de "Tv", criando inconsistência visual no histórico. |
| **4** | Ambos | Insere uma despesa no modal digitando o valor em R$ formatado em tempo real por uma máscara monetária inteligente (`R$ 1.250,00`). | O modal apresenta um `<input type="number" step="0.01">` puro sem máscara. Digitar números decimais em mobile apresenta barreiras de input. | `~` | Verified | **Erros de Preenchimento.** Risco de digitar valores incorretos devido à falta de uma máscara monetária e feedback numérico formatado em tempo real. |
| **5** | Ambos | Salva a transação. O sistema grava o registro, fecha o modal com animação fluida e atualiza a listagem de transações na tela sem refetch duplicado. | Faz o insert no Supabase. O callback dispara `fetchTransactions()`, enquanto a subscrição Postgres Realtime também ouve o evento e roda `fetchTransactions()`. | `!=` | Inferred | **Race Condition & Rede.** Duplo fetch síncrono concorrente pela mesma transação. Causa um breve piscar de layout e desperdício de banda. |
| **6** | Ambos | Com a transação manual criada, os saldos consolidados da barra de ferramentas (dashboards) são recomputados e refletem a alteração de imediato. | O insert na tabela `transactions` é executado com sucesso, **mas a função `reconcileBalances` não é disparada**. O saldo e receitas permanecem obsoletos. | `XX` | Verified | **[BLOCKER] Quebra de Integridade.** O saldo global do usuário no Dashboard e Gemini fica desatualizado até que outra ação force a reconciliação manual. |

---

## 🔬 Detalhamento de Estados por Step

### Step 1: Carregamento e Subscrição em Tempo Real
- **Input:** Navegação direta ou clique na sidebar no link `/transactions`.
- **System:**
  - Inicialização dos estados de controle de busca e formulários:
    ```typescript
    const [search, setSearch] = useState('');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    ```
  - Execução instantânea do `useEffect` que dispara `fetchTransactions()`.
  - Registro de canal WebSocket no cliente para escutar alterações em tempo real (`postgres_changes`):
    ```typescript
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTransactions();
      })
      .subscribe();
    ```
- **Output:** Renderização inicial do frame esmeralda com o spinner central animado (`animate-spin border-emerald-500`).
- **Side Effects:** Abertura de conexão WebSocket síncrona com o Supabase Realtime Server.
- **Backstage:** Alocação de thread de listener de rede no navegador para a escuta de canais de broadcast.

---

### Step 2: Unpaginated Fetch Waterfall
- **Input:** Ciclo de montagem do componente React.
- **System:**
  - Execução da query de leitura irrestrita:
    ```typescript
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    ```
  - *Problema Técnico Oculto:* Não há uso de `.range(from, to)` ou `.limit(N)`. A query retorna **todos** os registros de transações associados ao `user_id` ativo por força das políticas de RLS.
- **Output:** A tabela substitui o loader principal. Se vazia, renderiza o contêiner cinza com letreiro de busca. Se populada, exibe as linhas com efeitos de transição de hover (`group-hover:bg-emerald-500 group-hover:text-white`).
- **Side Effects:** Um `SELECT` irrestrito no PostgreSQL.
- **Backstage:** Leitura sequencial (`Seq Scan`) ou via índice `idx_transactions_user_date` no Supabase DB, retornando um payload JSON robusto que pode variar de kilobytes a megabytes.

---

### Step 3: Local Search Text Filter
- **Input:** Usuário digita palavras no input `<input placeholder="Buscar transação...">`.
- **System:**
  - Atualização do estado local `search` a cada keystroke.
  - Re-avaliação do filtro derivado em tempo de render:
    ```typescript
    const filtered = transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    );
    ```
- **Output:** O corpo da tabela descarta visualmente linhas que não coincidem com o termo digitado. A atualização é instantânea devido à re-avaliação em memória.
- **Side Effects:** Nenhum.
- **Backstage:** Alto consumo de CPU (Jank / Lag de frames) em dispositivos mobile de baixo desempenho se o array `transactions` possuir mais de 500 registros devido à execução repetitiva do filtro a cada tecla pressionada.

---

### Step 4: Transaction Insertion Modal & Form State
- **Input:** Clique no botão `<button onClick={() => setIsModalOpen(true)}>` seguido de preenchimento dos campos do formulário.
- **System:**
  - O estado `isModalOpen` muda para `true`, acionando a renderização condicional do modal flutuante.
  - Estados locais do formulário são alterados via inputs controlados: `description`, `category`, `amount`, `type`, `icon`.
- **Output:** O modal com efeito *glassmorphic backdrop blur* (`backdrop-blur-sm bg-slate-900/60`) é sobreposto à tela. O formulário exibe um switcher de Despesa/Receita com transições CSS fluidas de preenchimento.
- **Side Effects:** Nenhum.
- **Backstage:** Mudanças de estado limitadas ao Virtual DOM do React.

---

### Step 5: Submission & Realtime Execution Clash
- **Input:** Clique no botão `<button type="submit">Confirmar Transação</button>`.
- **System:**
  - Validação estática básica de campos preenchidos.
  - Cálculo do valor final multiplicando por `-1` caso seja uma despesa:
    ```typescript
    const numericAmount = parseFloat(amount) * (type === 'expense' ? -1 : 1);
    ```
  - Chamada assíncrona de inserção direta:
    ```typescript
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      description,
      category,
      amount: numericAmount,
      icon,
      date: new Date().toISOString()
    });
    ```
  - Em caso de sucesso, reseta os inputs e executa `fetchTransactions()`.
- **Output:** O modal se fecha. A listagem sofre um breve piscar enquanto os novos dados são renderizados na tabela.
- **Side Effects:** 
  1. Requisição HTTP `POST` para a API Restful do Supabase.
  2. Execução da chamada síncrona `fetchTransactions()` no callback do formulário.
  3. **Segunda** chamada síncrona `fetchTransactions()` disparada pelo listener WebSocket do Postgres Realtime que ouve o evento `INSERT`.
- **Backstage:** Inserção física de linha no disco do PostgreSQL. Disparo das notificações do WAL (Write-Ahead Log) para o listener Realtime do Supabase.

---

### Step 6: Omissão de Reconciliação (The Balance Desync)
- **Input:** Execução bem-sucedida do INSERT no banco de dados.
- **System:**
  - A transação é indexada na tabela `public.transactions`.
  - **Omissão Arquitetural:** O código em `src/app/transactions/page.tsx` não invoca a função `reconcileBalances(supabase, userId)` que recalcula os saldos no banco de dados e atualiza a tabela `public.balances`.
- **Output:** A tabela mostra a nova transação e o valor inserido com sucesso. Contudo, o saldo líquido consolidado exibido no topo da página ou na tela principal do dashboard **permanece imutável**.
- **Side Effects:** Inconsistência de integridade relacional temporária (descompasso de dados entre tabelas correlatas).
- **Backstage:** A tabela `public.balances` permanece no estado anterior ao insert, gerando desatualização nas métricas principais.

---

## 👻 Phantom Flows Detectados

Durante a auditoria estática do codebase, foram encontradas as seguintes lacunas de rotas, caminhos mortos e elementos inativos:

- **Ausência Absoluta de Rotas de Alteração / Remoção:** Embora a página exiba uma tabela visual com transições de hover premium, o usuário não possui **nenhuma interface** para excluir (`DELETE`) ou editar (`UPDATE`) transações lançadas de forma errônea. Não existem modais ou botões de ação na linha da tabela, gerando um beco sem saída operacional para correções simples.
- **Category-Icon Dropdown Desacoplado:** Os arrays de Categoria e Ícone no Modal de inserção operam de forma estática e redundante, gerando caminhos de erro visual onde o ícone gravado não condiz com a taxonomia do sistema financeiro.
- **Redundância de Fetch (Realtime vs Submit Callback):** A execução paralela de `fetchTransactions()` no fechamento do modal e no manipulador Realtime consome conexões concorrentes desnecessárias, criando uma sobrecarga síncrona redundante de dados trafegados na rede.

---

## ⚡ Recomendações e Plano de Correção

Para que a listagem de transações atinja o padrão inegociável exigido (*world-class*), as seguintes intervenções arquiteturais devem ser aplicadas:

### 1. Garantia Absoluta de Integridade via Trigger no Banco de Dados (Database Auto-Reconcile)
- **Gargalo:** O saldo em `balances` fica dessincronizado no insert manual porque a chamada a `reconcileBalances` foi omitida na página do cliente. Confiar no front-end para orquestrar integridade de dados é uma falha grave de arquitetura.
- **Solução:** Remover a responsabilidade de conciliação do front-end. Criar um **PostgreSQL Trigger** nativo no Supabase que recalculará automaticamente os agregados de saldo e os atualizará na tabela `balances` sempre que houver um `INSERT`, `UPDATE` ou `DELETE` na tabela `transactions`.
- **Código Proposto (SQL Migration):**
  ```sql
  CREATE OR REPLACE FUNCTION public.sync_transaction_to_balances()
  RETURNS TRIGGER AS $$
  DECLARE
      v_user_id UUID;
      v_income NUMERIC;
      v_expense NUMERIC;
      v_total NUMERIC;
  BEGIN
      -- Identifica o user_id conforme a operação
      IF (TG_OP = 'DELETE') THEN
          v_user_id := OLD.user_id;
      ELSE
          v_user_id := NEW.user_id;
      END IF;

      -- Calcula agregados em tempo real na tabela de transações
      SELECT 
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)
      INTO v_income, v_expense
      FROM public.transactions
      WHERE user_id = v_user_id;

      v_total := v_income - v_expense;

      -- Atualiza a tabela consolidada de saldos (balances)
      UPDATE public.balances SET amount = v_total WHERE user_id = v_user_id AND type = 'total';
      UPDATE public.balances SET amount = v_income WHERE user_id = v_user_id AND type = 'income';
      UPDATE public.balances SET amount = v_expense WHERE user_id = v_user_id AND type = 'expense';

      RETURN NULL;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE TRIGGER trigger_sync_transactions_balances
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_transaction_to_balances();
  ```
- **Custo:** **M** (Altamente resiliente, resolve o bug em nível de banco de dados para todas as origens: manual, PDF, Itaú BaaS, Gemini chat. Tempo de execução: 2h)

---

### 2. Paginação Server-Side e Busca Indexada (Supabase Performance Optimization)
- **Gargalo:** Puxar a base inteira em memória degrada a rede e estoura o limite do cliente conforme o histórico financeiro cresce.
- **Solução:** Implementar paginação server-side com limite dinâmico de 20 registros por página, aproveitando o índice `idx_transactions_user_date` no PostgreSQL, com filtros de busca executados no backend usando operadores `ilike`.
- **Código Proposto (Client integration):**
  ```typescript
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.ilike('description', `%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } ...
  };
  ```
- **Custo:** **M** (Ajuste estrutural em lógica de paginação e UI de paginação na tabela. Tempo: 3.5h)

---

### 3. Melhoria no Onboarding UX (First-Time User State Elegante)
- **Gargalo:** O "Empty State" atual gera confusão ao confundir falta de dados com busca infrutífera.
- **Solução:** Condicionar a exibição da tela vazia. Se `transactions.length === 0` e `search` estiver vazia, exibir um contêiner de onboarding premium estimulando a primeira inserção ou integração automática.
- **Custo:** **S** (Ajuste puramente visual de layout na página. Tempo: 1h)

---

### 4. Unificação Categoria-Ícone & Máscara de Preenchimento R$
- **Gargalo:** Escolhas manuais redundantes no modal de criação geram atrito e incoerências visuais.
- **Solução:** Criar um mapeamento interno de categorias para ícones padrão. Ao selecionar a categoria "Alimentação", o ícone correspondente `ShoppingCart` é atribuído de forma implícita e automática, simplificando o modal. Adicionar uma máscara monetária simples para formatar o valor como `R$ 0,00` no input do cliente.
- **Custo:** **S** (Ajuste no formulário client-side. Tempo: 1.5h)

---

## 🏓 Handoff de Especialistas

- **Para [hm-ux-flow](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-ux-flow.md):** Analisar a atração visual e a jornada de onboarding de novos usuários no módulo de transações. Garantir que o botão "Nova Transação" e o convite de integração guiem o fluxo sem sobressaltos e sem dependências ambíguas.
- **Para [hm-qa](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-qa.md):** Escrever scripts de teste ponta-a-ponta (E2E) para verificar a consistência dos saldos após a inserção manual, monitorando se a tabela `balances` e os widgets do Dashboard principal alteram seus estados síncronos sem a necessidade de recarregamento manual (F5).
- **Para [hm-performance](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-performance.md):** Monitorar o tráfego da rede na rota `/transactions` e validar a economia de largura de banda após a aplicação de paginação Server-Side baseada em `.range()` no Supabase.
- **Para [hm-designer](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-designer.md):** Desenhar o layout premium de "Empty State" para a visualização zerada da lista de transações, integrando ilustrações minimalistas em wireframe dark ou referências a importações de extrato (OFX/PDF).
