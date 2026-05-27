---
id: ux_audit_visao_geral
title: "Auditoria de Fluxo UX - Visão Geral (Dashboard)"
type: ux-audit
date: 2026-05-27
status: completed
tags:
  - ux-flow
  - audit
  - dashboard
  - g-finance
---

# UX FLOW AUDIT
**Projeto:** G-Finance  
**Página Analisada:** [Visão Geral (Dashboard Principal)](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/page.tsx)  
**Data:** 2026-05-27  
**Auditor:** UX/UI Cognitive Psychologist Subagent (Antigravity)

---

## 1. Mapeamento do Fluxo e Visão Geral
O Dashboard Principal da G-Finance atua como o **Centro de Comando Central** do usuário. O fluxo end-to-end nesta página consiste em:
- **Passo 1 (Autenticação e Carregamento):** O sistema verifica a sessão do Supabase, exibe um estado de carregamento e redireciona para `/auth` se o usuário não estiver autenticado.
- **Passo 2 (Leitura e Diagnóstico Rápido):** O usuário lê três cartões de saldo dinâmico (Saldo Total, Receitas, Despesas) e o gráfico de Fluxo de Caixa.
- **Passo 3 (Interação Conversacional / IA):** O usuário interage com o Gemini AI Brain para fazer consultas complexas por texto ou sugestões rápidas.
- **Passo 4 (Acompanhamento Financeiro Secundário):** O usuário observa pagamentos pendentes, progresso de metas de investimento e transações recentes.
- **Passo 5 (Navegação / Ação):** O usuário decide clicar em links de navegação para aprofundar em outras páginas (`/transactions`, `/wealth`, etc.).

**Passos Totais:** 5  
**Decisões Principais do Usuário:** 6 (Escolher visualizações, decidir o que perguntar para a IA, escolher atalhos de navegação, avaliar faturas pendentes, avaliar progresso de metas, efetuar logout).

---

## 2. Decisões Desnecessárias (Unnecessary Decisions)
*   **Logout Exposto como Ação de Destaque no Header de Boas-Vindas:**
    *   *Friction:* O botão **"Sair"** (Logout) está posicionado no canto direito da seção de boas-vindas do usuário com alto destaque visual (`bg-slate-900 text-white`). O Dashboard é a tela que o usuário mais acessa para verificar informações rápidas no dia a dia. Colocar o botão de logout em uma posição nobre e altamente acessível obriga o cérebro a processar essa opção destrutiva de fluxo desnecessariamente a cada visita. Além disso, aumenta drasticamente o risco de cliques acidentais em dispositivos móveis, interrompendo a sessão sem confirmação.
    *   *Fix:* Remover o botão "Sair" do painel de boas-vindas principal. O logout deve ser movido para o menu suspenso (dropdown) do Avatar no Header Superior ou ficar contido exclusivamente na aba de **Ajustes** (`/settings`), que é o padrão da indústria (e.g., Stripe, Linear).

---

## 3. Decisões Mal Posicionadas (Misplaced Decisions)
*   **Sugestão de Metas com Redirecionamento Confuso ("Ajustes"):**
    *   *Friction:* Quando o usuário não possui metas ativas, o empty state exibe a mensagem: *"Defina objetivos de economia nos Ajustes"*. Contudo, na barra lateral de navegação (Sidebar), existe uma rota explícita para **Investimentos** (`/wealth` - ícone `Target`), que é o local semântico ideal para gerenciar metas financeiras. Direcionar o usuário para a página de "Ajustes" para criar metas gera desorientação mental e desconexão conceitual.
    *   *Fix:* Alterar a mensagem e o link de direcionamento para guiar o usuário rumo à página de **Investimentos** (`/wealth`) ou criar um botão de ação direta ("Criar Meta") que abre o formulário correto em vez de exigir que ele navegue até Ajustes.

---

## 4. Decisões Sem Informação Suficiente (Information-Deficient Decisions)
*   **Gráfico de Fluxo de Caixa Cego (Aesthetic Distortion):**
    *   *Friction:* O gráfico de linha SVG é gerado combinando *apenas* as últimas 5 transações registradas no banco de dados. Isso distorce drasticamente a realidade financeira do usuário, mostrando uma curva de crescimento ou declínio baseada em uma amostragem minúscula, ignorando o histórico completo. Além disso, o gráfico não possui **eixos (X e Y), labels de valor (R$), escalas de tempo (Dias/Meses) ou hover states interativos**. O usuário é forçado a tentar interpretar decisões financeiras olhando para uma curva fluida bonita, mas que é matematicamente enganosa e semanticamente vazia.
    *   *Fix:* Substituir a amostragem de 5 itens por um agregado real mensal de receitas e despesas. Adicionar eixos minimalistas de valores e tempo, além de tooltips de hover para revelar os valores específicos nos pontos da curva.
*   **Indicadores de Tendência Sem Escopo Temporal (+0% / -0%):**
    *   *Friction:* Os cartões de estatísticas principais (Saldo, Receitas, Despesas) exibem badges de porcentagem de tendência (ex: `+0%`, `-12%`). O usuário não tem informação alguma sobre qual é a janela temporal de comparação desse percentual (é em relação ao mês anterior? À semana passada? Ao dia anterior?).
    *   *Fix:* Adicionar uma legenda em texto sutil logo abaixo do valor ou do badge (ex: *"vs. mês anterior"* ou *"este mês"*).

---

## 5. Pontos de Fricção Críticos (UX Friction Points)
1.  **Falsas Acessibilidades (Fake Clickables / Missing Affordances):**
    *   *Friction:* As seções **"Próximos Pagamentos"** (Reminders) e **"Transações Recentes"** mudam de estado visual ao passar o mouse (os reminders possuem um ícone `ChevronRight` que indica classicamente "clique para ver detalhes/pagar"; as transações mudam de cor no hover da linha). Contudo, **nenhum desses elementos é clicável**. O usuário clica na fatura pendente esperando ver como pagá-la ou marcá-la como paga, mas nada acontece.
    *   *Fix:* Transformar as linhas dos lembretes em botões interativos que abrem um modal de ação rápida (ex: "Marcar como Pago", "Ver Fatura") ou redirecionam para a página de faturas/assinaturas correspondente.
2.  **Paralisia de Ação na Criação de Transações (Dead-End na Visão Geral):**
    *   *Friction:* A ação mais comum e de alta frequência do usuário em um gerenciador financeiro é o lançamento rápido de uma despesa. O Dashboard principal oferece apenas leitura e um chat de IA. Não há um botão de ação rápida no layout ("Nova Transação" ou "Adicionar Entrada/Saída"). O usuário precisa ir até a aba de Transações, esperar o carregamento da lista e buscar o formulário.
    *   *Fix:* Implementar um botão de ação rápida no layout ("+ Lançar") que abra um drawer/modal de inserção de transação a partir de qualquer página.
3.  **Truncamento Crítico de Mensagens de Erro no Gemini Chat:**
    *   *Friction:* Caso ocorra um erro de rede ou estouro de cota da API da IA, o banner de erro vermelho aplica a classe CSS `truncate`. Se a mensagem de erro detalhada for longa, ela fica oculta pelo truncamento, fornecendo um feedback incompleto. O usuário fica sem saber a natureza do problema e sem saber como agir para consertar.
    *   *Fix:* Remover o truncamento (`truncate`) do container de erro e permitir que a mensagem de erro quebre linhas de forma elegante (`whitespace-normal`), fornecendo o feedback completo e instruções de recuperação.
4.  **Inacessibilidade Mobile (Severe Mobile Trap):**
    *   *Friction:* Em telas móveis, o layout da página colapsa corretamente para uma única coluna, mas a barra lateral de navegação (`Sidebar`) é estática e oculta-se sem qualquer mecanismo para ser ativada. **Não há um botão de menu hambúrguer no Header** para abrir a Sidebar no celular. O usuário fica completamente "preso" na Visão Geral, incapaz de navegar para qualquer outra página da aplicação através do smartphone.
    *   *Fix:* Adicionar um botão de hambúrguer responsivo no `<Header />` que abra a `<Sidebar />` como um painel lateral deslizante (Drawer / Mobile Bottom Sheet) quando visualizado em resoluções menores que `1024px`.

---

## 6. Recuperação de Erros (Error Recovery)
*   **Formulários Resilientes:** O chat de IA preserva a mensagem digitada pelo usuário quando ocorre uma falha, o que é excelente para evitar a re-digitação de comandos longos.
*   **Comunicação de Erros da IA:** Atualmente deficiente devido ao truncamento do texto no banner de erro (ver Ponto de Fricção 3).
*   **Tratamento de Estado Offline:** Não há avisos visuais ou tratamento resiliente caso a conexão com o Supabase caia temporariamente enquanto o usuário está navegando.

---

## 7. Estados Vazios (Zero/Empty States)
*   **Transações Recentes:** Possui um estado vazio bem implementado, com uma mensagem explicativa clara e um call-to-action ("Adicionar primeira transação") que direciona para a página correta.
*   **Próximos Pagamentos:** Possui um bom empty state informativo (*"Sem faturas pendentes. Tudo em dia para este mês!"*), mas carece de um botão para criar o primeiro lembrete caso o usuário queira.
*   **Metas Ativas:** Possui um empty state conceitualmente confuso que aponta o usuário para a página incorreta ("Ajustes" em vez de "Investimentos").

---

## 8. Estados de Carregamento (Loading States)
*   **Verificação de Sessão Principal:**
    *   *Friction:* Enquanto `loading` é `true`, o usuário é bloqueado com uma tela cinza e um spinner verde de rotação infinita centralizado. Isso viola a diretriz de design premium. O congelamento completo e o spinner genérico aumentam a percepção de lentidão do sistema.
    *   *Fix:* Substituir o spinner centralizado de tela cheia por um carregamento com **Skeletons/Shimmers** que simulam o layout dos 3 cards de estatísticas, o gráfico principal e os widgets laterais. Isso dá ao usuário um feedback visual imediato sobre a estrutura da página, reduzindo a sensação de tempo de espera.

---

## 9. Veredicto de UX
### **Página Visão Geral (Dashboard): OPTIMIZE**

> [!IMPORTANT]
> **Parecer Psicológico/Cognitivo:**  
> O Dashboard da G-Finance é esteticamente deslumbrante e de altíssimo nível visual (World-class), mas comete falhas cruciais na **relação de agência do usuário**. O excesso de elementos "falsamente clicáveis" (affordance quebrada nos lembretes e transações), o gráfico de fluxo de caixa que mente matematicamente ao usar apenas 5 itens e a impossibilidade física de navegação no mobile (ausência de menu hambúrguer) criam fricções cognitivas inaceitáveis para um produto premium.
>
> A página passa na avaliação estética com louvor, mas requer **otimizações estruturais imediatas** nos caminhos de decisão e ação para alcançar a verdadeira excelência de usabilidade.

---

### Plano de Ação Recomendado (Top 3 Prioridades)
1.  **Corrigir o Menu Mobile:** Adicionar suporte a menu hambúrguer no Header para que a barra lateral possa ser aberta em smartphones.
2.  **Corrigir a Lógica do Gráfico:** Alimentar o gráfico com dados consolidados reais e adicionar eixos de referência mínimos.
3.  **Remover Fake Clickables:** Tornar os lembretes de pagamentos e os cartões de metas clicáveis, ou remover as pistas de affordance (como o chevron e as reações ao hover) para evitar a frustração de cliques infrutíferos.
