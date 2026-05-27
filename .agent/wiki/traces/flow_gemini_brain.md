---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Gemini Brain (AI Chat & Extrato PDF Multimodal)"
date_created: 2026-05-27
primary_axis: "Resilience & Recovery"
secondary_axis: "Conversion"
blockers_found: 2
phantom_paths_detected: 1
---

# Flow Trace: Central Gemini Brain

## 📊 Visão Geral do Fluxo

A **Central Gemini Brain** (`/gemini`) representa o núcleo cognitivo e o motor de automação inteligente do **G-Finance**. Esta interface centraliza duas sub-aplicações essenciais de alto valor e sofisticação:
1. **Importador Inteligente de Extratos**: Um motor multimodal que extrai lançamentos estruturados de arquivos (PDF, PNG, JPG) de qualquer banco brasileiro, permitindo auditoria local em tempo real (Fila de Staging) antes da escrita física no Supabase.
2. **Chat Consultivo Avançado**: Um assistente conversacional inteligente integrado com o banco de dados do usuário (RLS nativo), que utiliza *Function Calling* (Tool Calling Loop) síncrono e recursivo para gerenciar de forma autônoma transações, metas e lembretes de pagamento.

- **Páginas Afetadas**: [page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/gemini/page.tsx) (`/gemini`)
- **Rotas de API**: [route.ts (chat)](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/api/ai/chat/route.ts), [route.ts (parse-statement)](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/api/ai/parse-statement/route.ts), [route.ts (diagnostics)](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/api/ai/test/route.ts)
- **Lógica e Libs**: [gemini.ts](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/lib/gemini.ts), [reconcile.ts](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/lib/reconcile.ts)
- **Personas Mapeadas**: **First-Time User (Zero State)** & **Steady-State User (Active Guilherme)**
- **Eixo Primário**: `Resilience & Recovery` | **Eixo Secundário**: `Conversion`

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

Abaixo está o mapeamento detalhado das etapas da jornada técnica do usuário, rastreando a conformidade entre a experiência ideal esperada por um time de engenharia de elite (*world-class*) e a implementação real no ecossistema de produção do G-Finance.

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | First-Time | Acessa `/gemini` e vê tela vazia (*zero state*) limpa e intuitiva, com cards educativos impecáveis. | Renderiza instantaneamente, exibindo drag zone e o aviso `Fila de Revisão Vazia` com o ícone `FolderMinus`. | `=` | *Verified* | Nenhum. O visual dark-grid premium gera alto impacto estético inicial. |
| **2** | Steady-State | Arraste de arquivo aciona painel de upload com indicação exata de carregamento de bytes e análise de IA. | `processFile` aciona um timer client-side que soma 10% a cada 150ms até travar em 90% enquanto aguarda a API do Gemini. | `~` | *Verified* | **[FRICÇÃO COGNITIVA]** A barra de progresso simulada trava em 90%. Se a IA demorar >10s, o usuário tem a sensação de travamento. |
| **3** | Steady-State | Retorno do parser converte dados estruturados e popula a Fila de Staging com transações mapeadas. | O JSON do Gemini Flash preenche o estado local `stagedTransactions`, gerando chaves temporárias estruturadas. | `=` | *Verified* | Nenhum. O cálculo de cabeçalho (Receita/Despesa/Transações) atualiza localmente em tempo real. |
| **4** | Steady-State | Edição manual de datas, descrições, categorias e inversão rápida de sinais via interface. | Inputs interativos reagem via `handleStagedChange`. O botão `Shuffle` permite inverter o sinal do valor na hora. | `=` | *Verified* | Extremamente polido e resiliente. Reduz o retrabalho de digitação manual de forma primorosa. |
| **5** | Steady-State | Exclusão de transações duplicadas ou indesejadas antes de persistir fisicamente no banco. | O botão de lixeira filtra a lista `stagedTransactions` do estado do React local sem chamar o banco. | `=` | *Verified* | Resposta instantânea e feedback rápido na tabela de staging. |
| **6** | Steady-State | Ao clicar em "Conciliar", o sistema persiste o lote no Supabase e recalcula saldos da central em tempo de execução sub-segundo. | Salva lote via bulk-insert e executa a função de reconciliação de saldos `reconcileBalances` de forma síncrona. | `!=` | *Verified* | **[BLOCKER CRÍTICO]** A função `reconcileBalances` busca todas as transações do usuário no banco para somá-las em memória Node. O(N) inviável. |
| **7** | Steady-State | Sucesso de importação limpa a fila e exibe modal com relatório de conciliação. | Zera o estado local e ativa a seção `importSuccess` mostrando dados formatados de receitas e despesas. | `=` | *Verified* | Perfeito. Visual claro e elegante de conclusão do fluxo. |
| **8** | Steady-State | Transiciona para a aba "Chat Consultivo", que exibe *onboarding states* e caixa de input premium. | Exibe visual rico da IA com o logotipo do Gemini Brain e o prompt de suporte a consultas integradas. | `=` | *Verified* | Transição de abas suave via CSS transition, sem recarregamento de página. |
| **9** | Steady-State | Pergunta complexa sobre saldos/reminders é enviada, respeitando *sliding window* e limites de contexto. | Envia prompt contendo o histórico de chat truncado (máx 20) e injeta dados agregados do Supabase em paralelo. | `=` | *Verified* | Eficiente. O paralelo `Promise.all` agiliza o tempo de resposta da API do Next.js. |
| **10** | Steady-State | Gemini executa Function Calling (escrita/leitura) com confirmações de banco seguras de forma invisível. | `generateFinancialResponse` executa consecutive loops de ferramentas (até 5) rodando RLS, e ao final recalcula saldos. | `~` | *Verified* | O loop funciona perfeitamente, mas o usuário só vê "Pensando..." sem logs de quais ações o robô está tomando no banco. |
| **11** | Steady-State | Retorna resposta em markdown polido com insights práticos, métricas e listagem estilizada de faturas. | Renders resposta na caixa de chat com scroll automático dinâmico até o final e visual tipográfico linear-style. | `=` | *Verified* | Altíssima qualidade visual e conceitual, respostas limpas e assertivas. |

---

## 🔬 Detalhamento de Estados por Step

### Step 2: Upload e Processamento Multimodal do Extrato
- **Input**: O usuário arrasta um arquivo `fatura_cartao_itau.png` ou seleciona via explorador de arquivos.
- **System**:
  - `uploading` passa para `true`.
  - Um loop `setInterval` inicia de 150ms em 150ms adicionando `10%` no `uploadProgress` com limite superior em `90%`.
- **Output**: O card de arrastar e soltar do Importador muda para o estado active de carregamento com a animação `animate-bounce` e exibe o texto *"Lendo com Gemini 3.5 Flash"*.
- **Side Effects**: Chamada HTTP POST assíncrona para `/api/ai/parse-statement` contendo o payload em `multipart/form-data` e o token JWT no cabeçalho `Authorization: Bearer <token>`.
- **Backstage**: O Route Handler Next.js descriptografa o JWT do Supabase, valida a sessão e chama `parseStatementWithAI` em `src/lib/gemini.ts`. O arquivo é convertido em Buffer base64 e despachado para a API do Gemini com o esquema JSON estrito (`responseSchema`).

---

### Step 6: Persistência Física e Reconciliação Global
- **Input**: Usuário clica no botão "Conciliar e Importar" contendo 12 transações na tabela de staging.
- **System**:
  - `importing` passa para `true`.
  - As transações são formatadas como um array contendo campos: `user_id`, `description`, `amount`, `category`, `date`, e `icon`.
- **Output**: Botão desativa mudando o texto para *"Conciliando..."* com uma animação de spinner rotativo (`animate-spin`).
- **Side Effects**:
  1. Comando SQL Bulk-Insert disparado contra a tabela `transactions` no Supabase.
  2. Chamada de retorno síncrona `reconcileBalances(supabase, userId)` que executa:
     - Select total de transações associadas ao usuário: `select amount from transactions where user_id = userId`.
     - Update múltiplo em paralelo (`Promise.all`) na tabela `balances` para sincronizar os campos `total`, `income` e `expense`.
- **Backstage**: O banco de dados valida as diretivas Row Level Security (RLS) do Supabase. Se o `user_id` da transação for diferente do usuário logado na sessão ativa, a inserção falha silenciosamente ou retorna erro 401/403.

---

### Step 10: Tool Calling Loop (Function Execution) no Chat
- **Input**: Usuário digita no chat: *"Crie um novo boleto para despesa de Internet de R$ 150 vencendo amanhã"* e envia.
- **System**:
  - `chatLoading` passa para `true`.
  - Mensagem do usuário é inserida na lista `chatMessages` com role `'user'`.
- **Output**: UI do chat é atualizada, exibindo a mensagem do usuário alinhada à direita e um balão de carregamento animado do Gemini Brain piscando *"Pensando..."* à esquerda.
- **Side Effects**: Chamada HTTP POST para `/api/ai/chat`.
- **Backstage**: 
  - A API resolve a requisição e a IA (Gemini Flash) identifica a intenção através de ferramentas mapeadas. Ela emite uma diretiva `functionCall` chamada `create_user_reminder` com argumentos: `{ title: 'Internet', amount: 150, dueDate: '2026-05-28', isRecurring: false }`.
  - O loop resolve a requisição no backend rodando a escrita via Supabase Server Client autenticado com a sessão do usuário Guilherme.
  - O banco de dados executa a gravação na tabela `reminders`. A variável `databaseModified` é setada como `true`.
  - Após rodar todas as chamadas do lote (lote de 1 ferramenta), o script de tool calling dispara uma única execução de `reconcileBalances` para sincronizar os saldos.
  - A resposta do banco é injetada no chat e o Gemini gera o texto final: *"Perfeito, Guilherme! Adicionei o boleto de Internet no valor de R$ 150,00 com vencimento em 28/05/2026 na sua lista de despesas pendentes. Os saldos e limites já foram recalculados."*

---

## 👻 Phantom Flows Detectados

Durante a auditoria estática do codebase, foi detectada uma rota morta (Phantom Flow) na infraestrutura de API:

- **[Diagnósticos de IA/Test API Route](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/api/ai/test/route.ts)**:
  - **Status**: **Ativo no Bundle do Servidor / Inacessível via UI**.
  - **Análise**: Este arquivo contém um Route Handler GET completo que testa a validade de conexões e chaves com a Google API. Ele funciona perfeitamente, aceita cabeçalhos e tokens do Supabase e retorna relatórios estritos de latência. Porém, **não há absolutamente nenhum botão, link ou seção de monitoramento na interface do G-Finance que acesse este endpoint**. Ele representa código morto que, embora útil para desenvolvimento/depuração, deveria estar sob um painel administrativo seguro ou removido da árvore de compilação pública de produção.

---

## ⚡ Recomendações e Plano de Correção

Com base nos princípios de arquitetura de alta performance e resiliência exigidos, estruturamos as correções técnicas com estimativa de impacto e custo.

### 1. Migração de Reconciliação Baseada em SQL Aggregates (Evitar O(N) Memory Exhaustion)
- **Gargalo**: A execução de `reconcileBalances` faz fetch completo de todas as linhas de transação do usuário na memória do Node para efetuar a soma. Conforme o uso escala (ex: >5000 transações), a RAM do servidor pode esgotar, causando erros de falta de memória (OOM), overhead na rede e latências de segundos.
- **Solução**: Mudar a consulta SQL para computar os agregados diretamente na Engine do Postgres via RPC (Remote Procedure Call) ou otimizando a query com a função de agregação nativa `sum`.
- **Implementação do Patch no Banco (SQL Migration)**:
  ```sql
  create or replace function calculate_user_balances(target_user_id uuid)
  returns table(
    total_balance numeric,
    total_income numeric,
    total_expense numeric
  ) as $$
  begin
    return query
    select 
      coalesce(sum(amount), 0) as total_balance,
      coalesce(sum(case when amount > 0 then amount else 0 end), 0) as total_income,
      coalesce(sum(case when amount < 0 then abs(amount) else 0 end), 0) as total_expense
    from transactions
    where user_id = target_user_id;
  end;
  $$ language plpgsql security definer;
  ```
- **Refatoração no Código Next.js (`src/lib/reconcile.ts`)**:
  ```typescript
  // Substituir a busca completa em memória por uma única chamada de RPC
  const { data: aggregates, error: rpcError } = await supabaseClient
    .rpc('calculate_user_balances', { target_user_id: userId });

  if (rpcError) throw rpcError;
  const { total_balance, total_income, total_expense } = aggregates[0];
  ```
- **Custo**: **M** (Ajuste simples de query + migração DB, impacto altíssimo na escalabilidade e latência).

### 2. Barra de Progresso com Decaimento Logarítmico (Eliminar Estagnação no Onboarding)
- **Gargalo**: O progresso travado em 90% gera incerteza cognitiva e falsa sensação de erro na aplicação.
- **Solução**: Substituir o intervalo simples linear por uma progressão assintótica (Logarithmic Decay). A barra avança rápido no início e vai diminuindo a velocidade conforme se aproxima do final, mas **nunca trava no mesmo dígito**, mantendo a indicação de atividade na tela.
- **Exemplo de Algoritmo Client-Side**:
  ```typescript
  const startProgress = () => {
    let current = 0;
    const interval = setInterval(() => {
      // Fórmula de decaimento logarítmico
      current += (98 - current) * 0.15; 
      setUploadProgress(Math.floor(current));
    }, 200);
    return interval;
  };
  ```
- **Custo**: **S** (Ajuste local no estado do React do componente de upload).

### 3. Exibição de logs em Tempo Real de Ferramentas de IA no Chat
- **Gargalo**: O usuário fica cego quanto à inteligência do sistema enquanto o backend executa loops consecutivos de transações/metas.
- **Solução**: Modificar o payload de resposta do Route Handler de chat para emitir tokens de status de ferramenta ou implementar micro-toasts informativos que informam qual ferramenta de banco está sendo chamada de forma elegante.
- **Custo**: **M** (Refatoração de fluxo no backend/client).

---

## ⚡ Tabela de Prioridades e Plano de Ação

| Categoria | Gargalo / Fricção Identificada | Solução Proposta | Custo (S/M/L) |
| :--- | :--- | :--- | :--- |
| **Banco de Dados** | Reconciliação O(N) com carregamento total em memória | Substituir por RPC de agregados nativos do PostgreSQL | **M** |
| **UX Onboarding** | Barra de upload travando em 90% | Implementar algoritmo de decaimento logarítmico | **S** |
| **Arquitetura** | Rota de Diagnóstico `/api/ai/test` solta (Phantom Route) | Mover para um painel administrativo protegido ou deletar | **S** |
| **UI/UX** | Falta de feedback visual em execuções de ferramentas | Adicionar logs sutis abaixo do balão "Pensando..." no chat | **M** |

---

## 🏓 Handoff de Especialistas

- **Para [hm-performance](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-performance.md)**: Validar o consumo de CPU da API Route de Chat quando o histórico está cheio. O limite de 20 mensagens é ideal, mas vale auditar o tamanho das strings.
- **Para [hm-engineer](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-engineer.md)**: Executar a migração PostgreSQL RPC sugerida para `reconcileBalances` e verificar gargalos de concorrência com travas de tabela em múltiplas requisições paralelas.
- **Para [hm-designer](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-designer.md)**: Projetar o novo microcopy e micro-animação das fases do upload (Decaimento logarítmico) mantendo a linguagem dark visual e editorial de altíssimo padrão.
- **Para [hm-qa](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-qa.md)**: Realizar testes de estresse enviando arquivos corrompidos ou PDFs gigantes (>20MB) e analisar o comportamento e limite de resposta da API de staging.
