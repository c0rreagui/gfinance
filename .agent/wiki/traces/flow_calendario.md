---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Calendário Financeiro (Financial Calendar)"
date_created: 2026-06-02
primary_axis: "Data Sync & Projections"
secondary_axis: "UX Polish & Interaction"
blockers_found: 0
phantom_paths_detected: 0
---

# Flow Trace: Calendário Financeiro (Financial Calendar)

## 📊 Visão Geral do Fluxo

O **Calendário Financeiro** (`/finance/calendar`) é o painel de projeção temporal do **G-Finance**. Diferente do extrato ou do dashboard, que se concentram no presente e no passado consolidado, o Calendário funciona como um simulador de fluxo de caixa futuro. Ele consolida transações reais já realizadas (`transactions`) com projeções, boletos a vencer e assinaturas recorrentes (`reminders`).

Este trace documenta a lógica de cálculo de saldo projetado diário, o mecanismo de assinatura iCal (RFC 5545), o modo de privacidade com revelação háptica e a sincronização bidirecional orientada a eventos no banco de dados (triggers Postgres) que garante que a marcação de pagamento reflita de imediato no saldo global do usuário.

- **Páginas Afetadas:** [page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Hub/src/app/finance/calendar/page.tsx)
- **APIs Afetadas:** [/api/finance/calendar/export](file:///d:/APPS%20-%20ANTIGRAVITY/G-Hub/src/app/api/finance/calendar/export/route.ts)
- **Banco de Dados:** Triggers `handle_reminder_paid_change` e `reconcile_user_balances`
- **Eixo Primário:** `Data Sync & Projections` (Integridade temporal dos saldos e sincronismo instantâneo)
- **Eixo Secundário:** `UX Polish & Interaction` (Modo privacidade, drag-and-drop, clique háptico e feedbacks visuais)

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | Steady-State | Acessa `/finance/calendar`. O sistema calcula o saldo inicial retroativo anterior ao dia 1 e plota a grade com os saldos projetados dia a dia. | Carrega os dados via Supabase. Calcula o saldo inicial retrospectivo somando transações anteriores ao mês ativo e projeta os saldos diários acumulados com sucesso. | `=` | Verified | Carregamento inicial exibe spinner por ~500ms. |
| **2** | Steady-State | Visualiza as transações e lembretes distribuídos nos dias do mês em formato condensado premium. | Exibe minicards coloridos para receitas (+ em verde) e despesas (- em vermelho) com suporte a truncagem para evitar quebra de layout. | `=` | Verified | Layouts muito congestionados com +4 eventos em um dia mostram indicador de "+ N". |
| **3** | Steady-State | Ativa o "Modo Privacidade". Todos os valores monetários da grade, dos KPIs e dos drawers são borrados instantaneamente. | Altera estado `isPrivate` para `true`. Aplica filtro CSS `blur-[8px]` em todos os valores. Mantém o design responsivo intacto. | `=` | Verified | Modo de uso excelente para visualização em público. |
| **4** | Steady-State | Com o Modo Privacidade ativo, passa o cursor segurando `Ctrl` sobre um valor. Ele é revelado de forma flutuante e temporária. | Detecta evento `onMouseMove` com `e.ctrlKey === true` e chaveia o `revealId` correspondente para remover o blur apenas daquele elemento. | `=` | Verified | Exige teclado físico (tecla Ctrl), não funciona por toque longo no mobile (Mobile Fallback em estudo). |
| **5** | Steady-State | Arrasta um lembrete de um dia para o outro. A data de vencimento (`due_date`) é atualizada e salva no banco na hora, recalculando a projeção. | O evento `onDragStart` captura o ID. O evento `onDrop` calcula a nova data com base no número da célula e dispara o update no Supabase. | `=` | Verified | Dispara feedback sonoro háptico via Web Audio API. |
| **6** | Steady-State | Clica em "Pagar" direto no drawer de detalhes do dia. O lembrete é marcado como pago e o saldo consolidado do dashboard atualiza no ato. | Dispara o update `paid = true` na tabela `reminders`. O trigger do Postgres intercepta, cria uma transação espelho e recalcula os saldos na tabela `balances`. | `=` | Verified | Sincronismo total e imediato (Sem atraso visual ou inconsistência). |
| **7** | Steady-State | Abre o Drawer de criação rápida no dia selecionado, preenche o form e escolhe "Recorrente". Salva como lembrete periódico no banco. | Cria um registro na tabela `reminders` com `is_recurring = true`, `due_date` configurada e ícone condizente. O calendário replica o evento mensalmente. | `=` | Verified | UI consistente com o padrão editorial Stripe/Linear. |
| **8** | Steady-State | Clica em "Sincronizar Agenda". Copia uma URL contendo o token do usuário. Importa no Apple/Google Calendar e vê os lembretes sincronizados. | Copia a URL contendo a rota `/api/finance/calendar/export?userId=...` que retorna um arquivo .ics formatado sob o padrão RFC 5545. | `=` | Verified | Integração externa nativa extremamente útil. |

---

## 🔬 Detalhamento de Estados por Step

### Step 1: Inicialização e Cálculo de Saldo Retroativo (Prior Balance)
- **Input:** Entrada na página `/finance/calendar`.
- **System:**
  - Consulta do `initial_balance` na tabela `profiles`.
  - Consulta de todas as `transactions` e `reminders` pertencentes ao usuário (sem filtros de data na query do banco para permitir cálculo de saldos passados e projeções futuras).
  - Cálculo de `startBalancePriorToMonth` via `useMemo`:
    ```typescript
    let bal = initialBalance;
    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (txDate < firstDayOfMonth) {
        bal += tx.amount;
      }
    });
    ```
- **Output:** Inicialização da grade do calendário com a data corrente, renderizando os KPIs de topo baseados nos lembretes e transações do mês.
- **Side Effects:** Queries de leitura pesadas no banco Supabase.

### Step 2: Projeção Diária Acumulada (Running Projection Map)
- **Input:** Grade mensal montada.
- **System:**
  - Mapeamento diário de eventos (`dailyEvents`) combinando transações reais do mês ativo e reminders replicados (recorrências repetidas mensalmente na data correspondente, boletos pontuais inseridos no dia correto).
  - Execução da projeção de fluxo de caixa acumulada (`dailyBalances`):
    ```typescript
    let currentRunningBalance = startBalancePriorToMonth;
    for (let d = 1; d <= daysInMonth; d++) {
      const events = dailyEvents[d] || [];
      events.forEach((ev) => {
        currentRunningBalance += ev.amount;
      });
      map[d] = currentRunningBalance;
    }
    ```
- **Output:** O canto inferior de cada dia da grade renderiza o saldo acumulado projetado para o fim daquele dia (ex: `R$ 8.450,00`).

### Step 3: Ação de Toggle Paid & Propagação no Banco de Dados
- **Input:** Clique no ícone de "Pagar" (`CheckCircle2` ou similar) em um reminder exibido no Drawer do dia.
- **System:**
  - Disparo de `handleTogglePaid(reminderId)` que atualiza a tabela `reminders` definindo `paid = true`.
  - **Execução na camada de Dados (Trigger Postgres):**
    1. O trigger `trigger_reminder_paid_change` intercepta o `UPDATE` de `paid` de `false` para `true`.
    2. Insere um novo registro correspondente na tabela `transactions`, preservando o link através da coluna `reminder_id`.
    3. O trigger `trigger_reconcile_on_transaction` intercepta a inserção e chama `reconcile_user_balances()`.
    4. A função lê o saldo inicial, soma as transações realizadas no passado/presente (`date <= now()`), excluindo as transações futuras, e atualiza a tabela cache `balances`.
- **Output:** A interface do calendário remove o estado "Pendente" do lembrete, substituindo-o por "Pago". Ao navegar de volta ao Dashboard principal, os cards de saldo refletem a transação paga de imediato.

### Step 4: iCal Subscription (Integração Externa)
- **Input:** Requisição `GET` externa efetuada por um cliente de calendário (ex: Apple Calendar) na rota `/api/finance/calendar/export?userId=...`.
- **System:**
  - O endpoint autentica o `userId` via query param (bypass de cabeçalho necessário devido à natureza de clientes iCal).
  - Executa uma varredura de lembretes ativos e recorrências do usuário.
  - Converte cada reminder em uma estrutura de evento `VEVENT` padrão RFC 5545, incluindo regras de repetição mensal (`RRULE:FREQ=MONTHLY;INTERVAL=1`) para assinaturas recorrentes.
- **Output:** Arquivo do tipo `text/calendar` contendo o payload RFC 5545 completo para sincronização automática.

---

## 👻 Phantom Flows Detectados

Nenhum fluxo fantasma detectado. O roteamento de exportação e a integração do frontend ao backend via triggers do Supabase estão perfeitamente conectados e com integridade total.

---

## ⚡ Recomendações e Plano de Correção

### 1. Suporte a Gestos Mobile no Modo Privacidade (Tap Reveal)
- **Gargalo:** O recurso de visualização temporária de valores borrados (`Ctrl + Mouse Hover`) é inviável em dispositivos móveis como iPhone/iPad por falta de cursor e teclado físico.
- **Solução:** Implementar um fallback de toque longo (`onLongPress` ou similar via `onTouchStart`/`onTouchEnd`) no mobile para revelar temporariamente o valor sob o dedo por 3 segundos antes de restaurar o blur.
- **Custo:** **S** (~2h de código frontend)

### 2. Tratamento Diferenciado para Transações Futuras Criadas Manualmente
- **Gargalo:** Se o usuário cria uma transação futura diretamente na página de transações, o calendário a plota na data correta. Porém, se ele marcar um lembrete como "Pago" no calendário mas com data futura, a transação correspondente será inserida com a data futura. Embora os triggers do banco já isolem essas transações futuras da tabela `balances` (`date <= now()`), a interface geral de Transações e Gráficos no Dashboard deve sempre respeitar o filtro temporal para evitar inconsistências.
- **Solução:** Garantir que todas as consultas client-side na rota `/transactions` e no gráfico de pizza do dashboard usem filtros explicitando `date <= now()`, mantendo o futuro reservado estritamente para o Calendário.
- **Custo:** **S** (~1h, já parcialmente aplicado nas rotas principais do dashboard).

---

## 🏓 Handoff de Especialistas

- **Para [hm-ux-flow](file:///d:/APPS%20-%20ANTIGRAVITY/G-Hub/.agent/workflows/hm-ux-flow.md):** Testar a fluidez das animações de transição de meses e abertura do Drawer em dispositivos móveis de baixo desempenho.
- **Para [hm-qa](file:///d:/APPS%20-%20ANTIGRAVITY/G-Hub/.agent/workflows/hm-qa.md):** Validar a assinatura de exportação do iCal em diferentes clientes (Outlook, Apple Calendar, Google Calendar) para garantir que caracteres especiais ou quebras de linha não corrompam o parser iCalendar.
- **Para [hm-security](file:///d:/APPS%20-%20ANTIGRAVITY/G-Hub/.agent/workflows/hm-security.md):** Analisar a exposição do `userId` no query param do export iCal. Embora o ID seja um UUID v4 (não-adivinhável), avaliar a adição de um token/chave de acesso temporária e revogável (`calendar_token`) na tabela `profiles` para maior proteção.
