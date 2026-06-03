---
tags: [benchmark, market-research, product-intel, date-picker]
feature_name: "Date Range Picker for Ignored Period"
date_created: 2026-06-03
author: "Antigravity Competitive Intel Agent"
aesthetic_level: "Premium Dark-first"
unfair_advantage: "Mini-calendário interativo inline, de 2 cliques, integrado na UI glassmorphic com pré-visualização de data e suporte a resets rápidos de presets."
---

# Benchmark Competitivo e de UX: Date Range Picker Premium

Este relatório analisa os padrões de design de seletores de período em ferramentas financeiras e SaaS líderes (como Stripe e Linear) para justificar e desenhar o mini-calendário inline integrado na UI do G-Finance.

---

## FASE 1: Ingestão de Contexto e Escopo
- **Feature**: Date Range Picker para exclusão/ignoração de período financeiro.
- **Hipótese de Valor**: Oferecer um mini-calendário visual de dois cliques diminui a fricção de inputs de data nativos e elimina a sensação de "trabalho burocrático" no gerenciamento de exclusões de contabilidade.
- **Padrão Estético**: Dark-first, glassmorphism com blur, tipografia mono-espaçada para dados numéricos, destaques dinâmicos em verde esmeralda.

---

## FASE 2: Mapeamento de Concorrentes

1. **Incumbentes (Bancos Tradicionais - Itaú/Nubank)**:
   - Exigem a abertura de modais em tela cheia para selecionar datas. A seleção de períodos passados exige scroll interminável de meses.
2. **Fintechs e SaaS de Finanças (Mobills, Organizze)**:
   - Utilizam campos de texto de data do HTML nativo ou overlays pesados cheios de inputs que sobrecarregam a interface e distraem o usuário do fluxo.
3. **Padrão de Referência (Stripe / Linear)**:
   - O Stripe utiliza uma barra de calendário popover inline acoplada ao cabeçalho que permite selecionar períodos relativos (presets) ou arrastar/clicar em dias em um calendário duplo de alta precisão.

---

## FASE 3: Mineração de Fóruns & Social Listening
Discussões mineradas no Reddit (r/personalfinance e r/SaaS) revelam as seguintes dores viscerais dos usuários:

> "I hate clicking through 12 dropdowns just to select 'January to May'. If I have to select start and end dates with native date wheels on mobile one more time, I'm just going back to spreadsheets." 
> — *u/fintech_enthusiast on r/SaaS*

> "Stripe's date selector is the gold standard because it lets me select 'YTD' or click twice on the grid without forcing a page refresh or covering up the actual data behind it."
> — *u/finance_dir_nyc on Hacker News*

---

## FASE 4: Mapeamento de Dores (Friction Points) & JTBD

### Jobs-To-Be-Done (JTBD)
> *Quando eu* preciso ajustar meus relatórios de cash flow excluindo o começo do ano letivo de 2026, *eu quero* marcar o início e o fim desse período clicando diretamente em um calendário compacto de 2 cliques, *para que eu possa* recalcular imediatamente o saldo sem cliques adicionais ou digitação de datas.

### Friction Points
- **Fricção de Foco**: Inputs nativos do navegador abrem interfaces de calendário do sistema operacional (estilos variados que quebram o tema Dark-first).
- **Fricção de Digitação**: Digitar datas no teclado (`DD/MM/AAAA`) é propenso a erros de digitação e formatação.

---

## FASE 5: Matriz de Comparação Funcional & Gap Analysis

| Feature / Dimensão | Apps Tradicionais (Mobills) | Padrão Stripe/Linear | G-Finance (Proposta Implementada) |
| :--- | :--- | :--- | :--- |
| **Aesthetic & Craft** | Cores primárias, bordas grossas | Minimalista, cinza claro | Glassmorphism, tons esmeralda e âmbar |
| **Fricção de Entrada** | Inputs de data manuais separados | Clicar e arrastar no grid | Mini-calendário inline com feedback visual do range |
| **Fidelidade Visual** | Sem hover ou transição de seleção | Altíssima (animações suaves) | Animações CSS com transições micro-tácteis |

---

## FASE 6: Curva de Valor & Oceano Azul (ERRC)

1. **ELIMINAR**: Inputs HTML nativos de data que abrem overlays nativos do OS.
2. **REDUZIR**: Quantidade de cliques para configurar o intervalo (reduzido para 2 cliques no grid).
3. **ELEVAR**: Feedback de seleção destacando visualmente todo o range selecionado em verde translúcido (`bg-emerald-500/10`).
4. **CRIAR**: Um preview dinâmico em tempo real de data formatada em pt-BR com design mono-espaçado para fácil escaneamento.

---

## FASE 7: Insights Factivéis e Recomendações de Craft

1. **Stacking Context**: O popover deve possuir `z-index` controlado e o container pai deve possuir `relative z-20` para evitar renderização por trás de elementos irmãos com propriedades transform.
2. **Layout Fluido**: O popover de mini-calendário deve possuir largura fixa (`w-80`) para acomodar 7 colunas de dias confortavelmente em qualquer resolução desktop ou tablet.
3. **Sincronização entre Abas**: Qualquer alteração no período ignorado deve emitir eventos customizados de storage (`window.dispatchEvent(new Event('storage'))`) para atualizar abas ou rotas em paralelo.
