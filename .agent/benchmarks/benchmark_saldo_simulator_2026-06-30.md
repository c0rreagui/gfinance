---
tags: [benchmark, market-research, product-intel]
feature_name: "Simulador de Saldo e Previsão"
date_created: 2026-06-30
author: "Antigravity Competitive Intel Agent"
aesthetic_level: "Premium Dark-first"
unfair_advantage: "Simulador offline e privado com sincronia automática ao Supabase local/cloud, sem expor dados bancários brutos ou custódia desnecessária."
---

# Benchmark de Produto — Simulador de Saldo e Planejamento

Mapeamento competitivo e inteligência de mercado para a nova funcionalidade de Simulação de Saldo (Gastos Planejados + Recorrências + Faturas).

---

## 1. Concorrentes Analisados
1. **Mobills / Organizze (Incumbentes):** Possuem simuladores estáticos baseados em metas de orçamento rígidas (planejamento por categorias). Alta fricção de entrada e designs poluídos por banners e propagandas.
2. **Planilhas Customizadas (Hacks do Usuário):** Soluções offline em Excel/Google Sheets criadas pelos próprios usuários por falta de flexibilidade nos apps tradicionais. Sofrem com a falta de sincronia em tempo real com saldos bancários e faturas de cartão.
3. **Copilot Money / Monarch Money (SaaS Modernos):** Excelentes em design e importação automática, mas carecem de simulação ágil e privada de múltiplos cenários para compras pontuais/parceladas com projeção futura em cascata (Waterfall cash flow).

---

## 2. Mineração de Fóruns & Dores
- **Reddit (r/personalfinance):** Usuários frequentemente reclamam da falta de ferramentas de "Sandbox" nos apps de finanças. *"I don't want to add a real transaction just to see if I can afford a new PC next month without screwing up my budget."*
- **Bugs e Falhas Comuns:** Concorrentes misturam lançamentos parcelados fictícios com lançamentos reais, quebrando o extrato bancário de reconciliação fiscal.
- **JTBD (Job-To-Be-Done):**
  > *Quando estou planejando comprar um item de alto valor, quero simular o impacto financeiro dele a curto e médio prazo, para saber exatamente se terei saldo disponível considerando minhas faturas e assinaturas antes de efetuar o pagamento.*

---

## 3. Matriz de Comparação Funcional

| Feature / Dimensão | Incumbentes (Mobills) | Planilhas Excel | G-Finance (Nossa Proposta) |
| :--- | :--- | :--- | :--- |
| **Aesthetics & Craft** | Poluído por ads, obsoleto | Grids básicos, sem identidade | World-class, Dark-first, Glassmorphism |
| **Sandbox de Simulação**| Inexistente (cadastra transação real) | Complexo de programar parcelas | Flexível (À Vista/Parcelado em 1 clique) |
| **Sincronia Bancária** | Parcial (APIs lentas) | Manual / Digitação total | Tempo real do Supabase + Mock Sandbox |
| **Privacidade** | Venda de dados agregados | Seguro localmente | RLS blindado + LocalStorage privado |
| **Projeção Multimeses** | Gráfico de barra simples | Linhas de cálculo manuais | Projeção automática em cascata (6 meses) |

---

## 4. Curva de Valor & Oceano Azul (ERRC)
- **ELIMINAR:** Necessidade de cadastrar lançamentos fictícios direto no extrato principal; cadastros demorados e fricção de setup.
- **REDUZIR:** Passos para simular uma compra parcelada (feita em um modal simples de 3 campos).
- **ELEVAR:** Visualização clara do consumo de saldo consolidado via medidor de esgotamento (depletion bar).
- **CRIAR:** Sandbox local 100% privado persistido no `localStorage`, garantindo sigilo total das intenções de compra do usuário e sem custos de banco de dados.
