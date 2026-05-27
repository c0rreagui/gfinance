---
title: Auditoria de Fluxo UX - Relatórios & Analytics
date: 2026-05-27
status: Completed
type: ux-audit
author: Antigravity UX Psychologist
target_page: "/analytics"
verdict: OPTIMIZE
---

# UX FLOW AUDIT

**Projeto:** G-Finance  
**Fluxos analisados:** Visualização e Interação com Relatórios Financeiros e Detalhamento Analítico por Categorias.

---

## FLUXO: Consumo de Relatórios e Análise de Tendências Financeiras
* **Passos:** 1 (Acessar a página `/analytics`)
* **Decisões do Usuário:** 4 (Identificar a saúde geral pelos KPIs; Comparar despesas por barra; Analisar linhas de tendência; Ordenar tabela de detalhamento)

---

### 1. DECISÕES DESNECESSÁRIAS
* **[Tabela de Detalhamento] Ordenação Duplicada para o mesmo resultado lógico:** 
  O usuário tem a opção de ordenar a tabela por **Total (R$)** e por **Participação (%)**. Matematicamente, a participação é uma função linear direta do total (Total da Categoria / Gasto Total). Logo, ordenar por qualquer uma das duas gera a exata mesma ordem de linhas. Oferecer duas decisões de ordenação separadas força o cérebro do usuário a processar duas colunas e avaliar qual escolher, gerando sobrecarga cognitiva inútil.
  * **Fix:** Unificar em uma única coluna ou remover a propriedade de ordenação independente de uma delas (ex: clicar em "Participação" ou "Total" executa a mesma ação de ordenação unificada).
* **[Acesso Global] Ausência de Filtro de Período Inicial:**
  O sistema carrega de forma automática e imutável "todas as transações do início dos tempos". O usuário é obrigado a analisar um escopo temporal que ele não escolheu e que pode não fazer sentido para a análise atual.
  * **Fix:** Aplicar um filtro de período default inteligente (ex: "Mês Atual" ou "Últimos 3 Meses") com um seletor explícito de datas no header.

---

### 2. DECISÕES MAL POSICIONADAS
* **[Tabela e Gráfico] Análise de Despesas por Categoria isolada de Receitas:**
  O gráfico de barras e a tabela de detalhamento focam estritamente em **Despesas**. Se o usuário quer entender o detalhamento das suas **Receitas** por categoria (quais fontes de renda trouxeram mais capital), essa decisão está bloqueada. Ele precisaria ir até a listagem de transações geral e filtrar manualmente.
  * **Fix:** Adicionar um seletor do tipo de fluxo (Despesas / Receitas) no topo da seção de categorias para contextualizar a análise sob demanda.

---

### 3. DECISÕES SEM INFORMAÇÃO SUFICIENTE
* **[Tendência Mensal] Gráfico Sparkline de Linha Cego (Estático):**
  O gráfico de tendência mensal exibe uma linha verde (receita) e vermelha (despesa) bonita, mas é inteiramente **estático**. O usuário vê picos e vales acentuados, mas não sabe o valor numérico exato de nenhum ponto, nem qual mês específico representa cada ponto sem ter que contar as marcas no eixo X. Ele é forçado a adivinhar ou fazer contas mentais.
  * **Fix:** Implementar ativamente tooltips interativos no hover que mostram o mês, receita exata, despesa exata e o saldo daquele período específico.
* **[Legenda de Cores] Significado das Cores nas Categorias:**
  As cores usadas nas barras e na tabela são atribuídas dinamicamente via array de cores (`categoryColors[i % colors.length]`). Elas não possuem consistência conceitual fixa. Uma mesma categoria pode ter cores diferentes em outras partes do app, e o usuário precisa decifrar visualmente a cada render.
  * **Fix:** Consolidar um mapeamento de cores fixas por categoria no banco ou em um dicionário estático (ex: "Alimentação" sempre emerald, "Transporte" sempre amber).

---

### 4. FRICTION POINTS (Pontos de Fricção)
* **[Performance & Escalabilidade] Carga total client-side sem paginação/limite:**
  O código faz um `select('*')` na tabela de transações inteira no banco. Para um usuário real de longo prazo com mais de 2.000 transações, isso trará megabytes de payload na rede e causará travamentos na thread principal do React durante o processamento de agregação (`useMemo`). 
  * **Impacto:** Fricção severa de carregamento e responsividade. O app deixa de ser instantâneo (world-class) e passa a engasgar com o tempo de uso.
  * **Fix:** Transferir as agregações de KPI e tendências para queries agregadas nativas do Postgres/Supabase ou limitar a busca client-side por um range de datas padrão (ex: `where date >= now() - interval '1 year'`).
* **[Feedback Visual] Ausência de Hover States Indicativos nas Tabelas:**
  Os cabeçalhos da tabela possuem `cursor-pointer`, mas não indicam claramente ao cérebro do usuário que são clicáveis antes do movimento do mouse. 
  * **Impacto:** Baixa detectabilidade de affordance.
  * **Fix:** Incluir um ícone sutil de seta ao lado do texto da coluna ou um sublinhado suave no hover para guiar o usuário.

---

### 5. RECOVERY DE ERRO
* **[Grave] Ocultação de Erros de Conexão sob Falsa Escassez:**
  Se a query do Supabase falhar por queda de conexão ou expiração de token, o bloco `catch` apenas printa no `console.error` e prossegue para setar `loading` como `false`.
  Como o estado de transações continua vazio, a interface renderiza o **Empty State** dizendo "Sem dados suficientes. Registre transações".
  * **Impacto:** Extremo estresse cognitivo. O usuário pensará que perdeu todos os seus dados financeiros devido a um erro silencioso do sistema.
  * **Fix:** Introduzir um estado de erro real (`error` state), exibindo uma tela de erro elegante com a mensagem "Não foi possível carregar seus dados" e um botão destacado para "Tentar Novamente".

---

### 6. EMPTY STATES
* **[Tela de Dados Vazios] Sem Ação Primária (Beco Sem Saída):**
  O empty state é esteticamente limpo e explica por que está vazio, mas não oferece nenhuma saída imediata para o usuário. Não há um botão de ação.
  * **Falta:** Um botão CTA centralizado ("Adicionar Primeira Transação" ou "Importar Extrato") que dê vazão imediata à frustração do usuário de ver uma tela vazia.
  * **Fix:** Inserir um botão de ação principal redirecionando o usuário para o modal ou página de criação de transações.

---

### 7. LOADING STATES
* **[Reprovado] Spinner Genérico Indefinido:**
  Durante a carga, a página renderiza um círculo girando (`animate-spin`) solitário no centro da tela. 
  * **Falta:** Fiel ao padrão Highermind, spinners genéricos são reprovados porque aumentam a percepção de tempo de espera do cérebro.
  * **Fix:** Implementar um **Skeleton Loader** refinado que simule a estrutura tridimensional dos cards de KPI e dos blocos de gráfico de barra enquanto os dados reais não chegam.

---

## VEREDICTO DE UX: OPTIMIZE

> [!IMPORTANT]
> A página possui uma fundação sólida e renderização de dados refinada, mas falha em aspectos cruciais de **Agência Temporal** (falta de filtros de data), **Transparência de Sistema** (mascaramento de erros de banco como "banco vazio") e **Engajamento Ativo** (gráficos mudos e ausência de CTAs no empty state). 

### Plano de Ação Recomendado:
1. **Adicionar Seletor de Período** no header (Mês atual, Mês anterior, 3 meses, Personalizado).
2. **Substituir o Spinner Genérico** por Skeletons animados das métricas e tabelas.
3. **Criar um Componente de Erro de Conexão** explícito com botão de retry.
4. **Inserir botão de ação** "Adicionar Transação" no Empty State.
5. **Habilitar Tooltips Interativos** no gráfico de tendência mensal (Sparkline).
