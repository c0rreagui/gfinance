---
title: "UX Audit - Cartões & Limites"
date: 2026-05-27
author: Antigravity
type: ux-audit
status: completed
verdict: OPTIMIZE
tags:
  - ux-audit
  - cards
  - finance
---

# UX FLOW AUDIT: Cartões (Credit Cards & Limits)

**Projeto:** G-Finance  
**Analista:** Antigravity (Advanced AI UX/UI Psychologist)  
**Data:** 2026-05-27  
**Foco:** Qualidade de Decisão, Carga Cognitiva e Resiliência de Fluxo  

---

## 1. Mapeamento do Fluxo Geral

*   **Fluxo Principal:** Visualização de dados do cartão, acompanhamento de limites e faturas, ajuste dinâmico de limite de crédito e consulta a lançamentos recentes.
*   **Total de Passos Estáticos/Interativos:** 3 passos principais (Ver número do cartão, Ajustar slider de limite, Rolar transações).
*   **Decisões do Usuário:** 2 decisões interativas (Decidir revelar/ocultar número do cartão; Decidir ajustar limite de crédito).

---

## 2. Análise Detalhada de Decisões

### A. Decisões Desnecessárias
*   **Revelação de Número Ficcional Estático:**
    *   *Friction/Problema:* O botão de revelar número do cartão (ícone de `Eye`/`EyeOff`) simula uma ação de segurança real. Contudo, o número revelado é fixo no frontend (`"4290 8812 3456 9912"`). A revelação em si não traz utilidade prática ou novos dados operacionais (como CVV ou cópia rápida).
    *   *Carga Cognitiva:* Baixa, mas gera frustração estética ao perceber que a interação não expõe dados reais nem permite ações adicionais.
    *   *Fix:* Se for meramente demonstrativo, manter o número parcialmente mascarado ou permitir a cópia para a área de transferência com um clique no cartão.
*   **Granularidade Rígida do Slider:**
    *   *Friction/Problema:* O controle de ajuste de limite é exclusivamente baseado em um input de range com step rígido de `R$ 5.000` (variando de `10.000` a `100.000`). O usuário é forçado a fazer uma mira física de alta precisão no slider para valores intermediários, sem poder digitar o valor exato desejado.
    *   *Fix:* Incluir um campo de input numérico acoplado para permitir que o usuário digite opcionalmente o valor exato do limite (ex: `R$ 17.500`), mantendo o slider como representação visual secundária.

### B. Decisões Mal Posicionadas
*   **Slider de Limite Sem Ação de Confirmação:**
    *   *Friction/Problema:* O slider altera instantaneamente o estado local do React (`cardLimit`), atualizando os valores em tempo real na tela. Porém, essa mudança **não possui persistência** no banco de dados e não há um botão "Salvar Limite" ou "Confirmar Alterações". O fluxo sugere uma alteração definitiva e instantânea de limite de crédito (decisão de alta gravidade financeira), mas ao atualizar a página, o limite volta silenciosamente para o valor padrão hardcoded de `25.000`.
    *   *Carga Cognitiva:* Crítica. O usuário toma uma decisão que acredita ser persistida no sistema, mas sofre perda de dados sem qualquer feedback ou aviso.
    *   *Fix:* Adicionar um botão primário de confirmação abaixo do slider (ex: "Confirmar Novo Limite") que realize a persistência no Supabase, ou exibir uma notificação/toast indicando "Alteração simulada - não salva no perfil".

### C. Decisões Sem Informação Suficiente
*   **Estouro de Limite Permitido Sem Alerta:**
    *   *Friction/Problema:* Se a fatura atual utilizada (`usedLimit` calculada via transações do Supabase) for maior que o valor mínimo do slider (`R$ 10.000`), o usuário ainda consegue mover o slider para valores abaixo da fatura atual. Se ele desliza o limite máximo para `R$ 10.000` enquanto tem `R$ 12.000` gastos:
        1. A barra de progresso excede 100%.
        2. O limite disponível torna-se negativo (`R$ -2.000`).
        3. A interface permanece verde (`bg-emerald-500`) com a badge de status pacífica "Sob Medida" (indicando segurança/perfeição).
    *   *Carga Cognitiva:* O usuário não recebe feedback semântico de que excedeu o limite máximo ou de que a operação é inválida. A interface falha em alertar sobre inconsistência financeira.
    *   *Fix:* Adicionar uma validação de limite. Se o limite escolhido for inferior à fatura atual, mudar a cor da barra e dos textos de destaque para vermelho/amber (aviso de "Limite Excedido") e bloquear/notificar o usuário.

---

## 3. Catálogo de Pontos de Friction (UX Friction Points)

### Friction 1: Distorção de Valores no Estado Vazio (Zero-State Summation Fallback)
*   **Descrição:** O maior bug de UX identificado no código. O estado `usedLimit` é inicializado com um placeholder estático de `8244.70`. No `useEffect`, a query busca transações na categoria "Cartão". Se a resposta for vazia (ou seja, o usuário não tem nenhuma transação lançada no cartão), o código executa a validação:
    ```typescript
    if (sum > 0) setUsedLimit(sum);
    ```
    Como `sum` é `0`, a função `setUsedLimit` **nunca é chamada**, mantendo o valor inicial hardcoded de `8.244,70`.
*   **Impacto:** Contradição de dados severa. O painel direito de transações exibe com destaque o Empty State: *"Nenhuma compra no cartão. Lance transações na categoria 'Cartão'..."*, mas o painel esquerdo exibe alegremente uma Fatura Atual de **R$ 8.244,70**. Isso destrói a confiança do usuário no sistema financeiro, que visualiza uma cobrança fantasma.
*   **Fix:** Mudar o estado inicial de `usedLimit` para `0` e atualizar o estado sempre que a query retornar, mesmo que a soma seja zero:
    ```typescript
    if (allTxs) {
      const sum = allTxs.reduce((acc, t) => acc + Math.abs(t.amount), 0);
      setUsedLimit(sum); // Seta 0 se a soma for zero, limpando o placeholder
    }
    ```

### Friction 2: Affordance Falsa no Cartão 3D (Dead Click Zone)
*   **Descrição:** O container do cartão "G-Black" possui classes CSS de hover dinâmico (`hover:scale-[1.02] transition-all duration-500 cursor-pointer`), sugerindo fortemente que clicar nele ativa alguma funcionalidade (ex: expandir detalhes, ver dados do cartão virtual ou copiar dados). No entanto, o clique no cartão não faz absolutamente nada. A única área clicável de fato é o pequeno ícone do olho que interrompe a propagação.
*   **Impacto:** Sensação de que o sistema está quebrado ou incompleto (Dead End).
*   **Fix:** Remover `cursor-pointer` e o efeito de hover exagerado se o cartão for meramente ilustrativo, OU implementar uma ação de verdade (como abrir um modal com os dados detalhados do cartão virtual e botão de copiar número).

### Friction 3: Ausência de Indicador de Rotação (Scroll Affordance)
*   **Descrição:** A lista de transações recentes utiliza `no-scrollbar` para esconder a barra de rolagem nativa. Se a lista ultrapassar a altura máxima disponível, as transações continuam rolando internamente, mas não há qualquer pista visual (fade gradiente ou barra sutil) que indique ao usuário que há mais transações abaixo.
*   **Impacto:** O usuário pode deixar de visualizar lançamentos antigos simplesmente por não perceber que a lista é rolável.
*   **Fix:** Implementar um gradiente de desvanecimento (*fade-out opacity*) no rodapé da lista que desaparece quando o usuário atinge o final do scroll, ou reativar uma barra de rolagem estilizada muito sutil.

---

## 4. Auditoria de Estados Especiais

### Recovery de Erro (Error Recovery)
*   **Cenário de Falha do Supabase:**
    *   *Status:* **Quebrado/Deceptivo**.
    *   *Comportamento Atual:* Se a requisição de transações falhar (erro de rede, RLS ou credenciais expiradas), o bloco `catch` apenas printa um erro no console e remove o loading. O usuário vê a tela sem qualquer aviso de erro, com os valores placeholders perfeitamente renderizados como se fossem reais.
    *   *Fix:* Implementar um banner ou toast de erro visível (ex: "Não foi possível carregar os lançamentos do seu cartão. Tente novamente mais tarde.") e renderizar estados de fallback visualmente seguros.

### Empty States (Estados Vazios)
*   **Lista de Lançamentos:**
    *   *Status:* **Parcialmente Tratado**.
    *   *Comportamento Atual:* Existe um bom empty state conceitual com ícone `AlertCircle`, informando que não há compras e sugerindo como lançar. No entanto, o painel esquerdo não acompanha esse empty state devido à falha de zerar o `usedLimit` detalhada na Friction 1.

### Loading States (Estados de Carregamento)
*   **Transações Recentes:**
    *   *Status:* **Básico (Spinner)**.
    *   *Comportamento Atual:* Um spinner centralizado gira na lista de transações. O restante da página (valores de limite e o cartão) é exibido instantaneamente com dados mockados antigos antes de dar o jump de atualização pós-loading.
    *   *Fix:* Implementar um shimmer skeleton na lista de transações que respeite o formato do card de lançamento e aplicar um estado de shimmer sutil nos valores de limite esquerdo até que os dados reais sejam calculados.

---

## 5. Veredicto Final de UX

### **VEREDICTO: OPTIMIZE**

> [!WARNING]
> O fluxo atual possui altíssimo apelo estético visual (cumprindo a promessa de interface premium), mas falha gravemente no quesito **Integridade Psicológica do Usuário** ao exibir dados fantasmas de fatura no estado vazio (Friction 1), dar falsa sensação de alteração persistida no slider sem salvar (Decisão Mal Posicionada) e não avisar o usuário sobre estouro de limites ou erros de API.
> 
> A página requer otimizações cruciais no tratamento de estado (`useState`), sincronização com o backend e microcopy para atingir o padrão *World-Class*.

---

### Plano de Ação Recomendado (Próximos Passos de Engenharia)

1.  **Corrigir Zeramento de Fatura:** Mudar a lógica do parser de transações para zerar o `usedLimit` se a consulta do banco de dados vier vazia ou retornar erro.
2.  **Adicionar Persistência de Limite:** Criar uma coluna `credit_limit` na tabela de perfil ou configurações do usuário no Supabase e disparar um `update` debounced (ou via botão de confirmação explícito) para salvar a escolha do slider.
3.  **Implementar Feedback de Limite Excedido:** Adicionar cores dinâmicas e aviso caso o usuário deslize o limite abaixo da sua fatura atual.
4.  **Resolver Falsa Affordance do Cartão:** Adicionar botão funcional para copiar o número do cartão para o clipboard e disparar um toast de confirmação.
