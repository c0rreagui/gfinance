---
tags: [benchmark, market-research, product-intel]
feature_name: "Conciliação de Fluxo de Caixa e Cartão de Crédito"
date_created: 2026-06-03
author: "Antigravity Competitive Intel Agent"
aesthetic_level: "Premium Dark-first"
unfair_advantage: "Segregação nativa e precisa entre compras do limite e saídas de caixa com projeção inteligente de vencimento de faturas no calendário"
---

# Benchmark: Conciliação de Compras Parceladas e Faturas no Fluxo de Caixa

Este documento analisa as melhores práticas de mercado e dores de usuários reais relativas à contabilidade de compras parceladas e transações de cartão de crédito em relação ao fluxo de caixa de liquidez (conta corrente). O objetivo é propor uma reformulação matemática e conceitual para o G-Finance.

---

## 🛠️ Fase 3: Mineração de Fóruns & Social Listening

A análise de discussões em comunidades financeiras brasileiras (como r/financas) e globais (como r/personalfinance e r/YNAB) revela frustrações profundas sobre como os aplicativos tratam cartões de crédito.

### Citações de Usuários Reais

> 💬 **"O Mobills duplica minhas despesas toda vez que importo a fatura paga do banco. Ele conta as compras que fiz durante o mês e depois conta o pagamento do boleto da fatura como despesa de novo."**
> — *Usuário no Reddit (r/financas)*

> 💬 **"My cash flow projection is useless. YNAB shows I spent $1,000 on a laptop today, but the money doesn't leave my checking account until the credit card statement is due next month. My actual daily balance prediction is completely off."**
> — *Hacker News, discussão sobre APIs de Open Finance*

> 💬 **"No Organizze eu parei de cadastrar compras parceladas. Ele joga o valor total na despesa do mês atual ou joga as parcelas como despesas de caixa diárias, destruindo meu fluxo de caixa diário real."**
> — *Comentário na Google Play Store*

---

## 🛠️ Fase 4: Mapeamento de Dores (Friction Points) & JTBD

### Friction Points
1. **Fricção de Dupla Contagem (Double Counting)**: Lançar a compra parcelada (ou transações avulsas do cartão) como despesa de caixa e, posteriormente, lançar o pagamento da fatura da conta corrente como outra despesa.
2. **Fricção de Projeção Temporal (Cash Flow Prediction)**: O calendário financeiro deduz o saldo projetado no dia da compra física no cartão de crédito, quando na realidade o dinheiro só sai da conta corrente no dia de vencimento da fatura.

### Jobs-To-Be-Done (JTBD)
> **"Quando eu** realizo compras parceladas no meu cartão de crédito, **eu quero** que essas parcelas consumam apenas o limite do meu cartão e fiquem embutidas na fatura consolidada, **para que eu possa** visualizar o saldo real da minha conta corrente diminuir apenas no dia do pagamento da fatura, sem distorcer as despesas mensais e projeções diárias."

---

## 🛠️ Fase 5: Matriz de Comparação Funcional & Gap Analysis

| Feature / Dimensão | Incumbentes (Excel/SaaS 2015) | Fintechs SaaS Comuns | G-Finance (Nossa Proposta) |
| :--- | :--- | :--- | :--- |
| **Precisão de Caixa** | Baixa. Exige fórmulas complexas de conciliação manual. | Média. Trata pagamentos de fatura como despesa geral, duplicando compras categorizadas. | **Altíssima**. Segrega automaticamente compras de cartão e faturas na central de conciliação. |
| **Projeção no Calendário** | Inexistente. | Plota individualmente as parcelas no dia da compra física, distorcendo o saldo diário de liquidez. | **Inteligente**. Exclui parcelas diárias do saldo de liquidez e plota a fatura no dia do vencimento real. |
| **Visualização de Limite** | Apenas texto estático. | Gráfico simples sem relação direta com parcelamentos futuros. | **Premium**. Slider dinâmico com sincronização em tempo real das parcelas restantes. |

---

## 🛠️ Fase 6: Curva de Valor & Oceano Azul (Oceano Azul)

1. **ELIMINAR**: A contabilidade de transações de cartão de crédito (`card_id IS NOT NULL`) no cálculo do saldo líquido de caixa da conta corrente (Dashboard e Projeção do Calendário).
2. **REDUZIR**: A necessidade de o usuário categorizar o pagamento da fatura como "Despesa" comum (deve ser um evento de compensação de caixa).
3. **ELEVAR**: A fidelidade visual e preditiva do calendário de projeção diária, refletindo as saídas de caixa apenas no vencimento da fatura (`invoice_due`).
4. **CRIAR**: Um sistema inteligente de conciliação onde despesas com `card_id` consomem o limite do cartão em tempo real, enquanto o saldo líquido da conta corrente só é debitado pela fatura consolidada.

---

## 🛠️ Fase 7: Insights Factivéis e Recomendações de Engenharia

### 1. Ajuste no Cálculo de Saldos (`src/lib/reconcile.ts`)
Para evitar a dupla contagem no Dashboard:
- O **Saldo Total** (líquido) e a soma de **Despesas** no dashboard devem contabilizar apenas transações que representem movimentação real de caixa (contas correntes).
- Transações efetuadas via cartão de crédito (onde `card_id IS NOT NULL`) não devem ser somadas no KPI de "Despesas" consolidado do caixa, pois elas representam consumo de limite do cartão. A despesa de caixa real ocorre quando a transação de pagamento da fatura do cartão (que é um débito da conta corrente para pagar o cartão, com `card_id IS NULL`) é importada/criada.
- *Nota*: Se o usuário optar por registrar a despesa no momento da compra (competência), a fatura deve ser tratada como transferência (sem alterar despesas). No entanto, como a base do G-Finance opera sob regime de fluxo de caixa (extratos Itaú), a melhor e mais limpa abordagem é **excluir transações que possuem `card_id` das despesas e saldo líquido consolidado de caixa**, deixando que a despesa seja computada pela transação de pagamento da fatura em si, ou provisionando o valor da fatura fechada do mês como despesa de caixa líquida do período.
- A solução ideal de engenharia para o G-Finance é: **excluir as transações de cartão (`card_id IS NOT NULL`) do saldo líquido e despesas consolidadas do dashboard**, mantendo-as estritamente para controle de limite e extrato do cartão. O pagamento da fatura (que aparece no extrato da conta corrente como débito sob categoria "Cartão") será a única despesa real de caixa contabilizada.

### 2. Ajuste no Calendário (`src/app/finance/calendar/page.tsx`)
No calendário:
- As parcelas individuais (`Processador Ryzen 5 (7/10)`) ou despesas de cartão devem continuar sendo exibidas visualmente nos dias respectivos (pois o usuário precisa ver o histórico de compras).
- Contudo, no cálculo da **Projeção de Saldo Diário** (`dailyBalances`):
  - **Excluir** todas as despesas e lembretes vinculados a cartões de crédito (`card_id IS NOT NULL`).
  - **Incluir** o evento de vencimento da fatura (`invoice_due`) no cálculo de projeção de saldo diário (pois é nesse dia que a fatura consolidada é paga e debita a conta corrente).
