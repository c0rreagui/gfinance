---
title: "UX Flow Audit: Assinaturas & Recorrências"
type: ux-audit
date: 2026-05-27
status: completed
author: Antigravity (UX/UI Psychologist)
tags:
  - ux-audit
  - g-finance
  - subscriptions
  - cognitive-load
---

# UX FLOW AUDIT: Assinaturas & Recorrências

**Projeto**: G-Finance  
**Página**: Assinaturas & Recorrências (`/subscriptions`)  
**Código Analisado**: [page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/subscriptions/page.tsx)  
**Nível de Rigor**: World-Class UX/UI Psychologist Audit  

---

## 🧠 VISÃO GERAL COGNITIVA & JORNADA
A página de Assinaturas & Recorrências destina-se a dar ao usuário controle e clareza sobre suas despesas fixas recorrentes. No entanto, ao analisar a arquitetura de decisões e o fluxo de dados end-to-end, identificamos múltiplos pontos de **fricção crítica**, **incoerência semântica**, **violabilidade de affordances** e **sobrecarga cognitiva** que sabotam a experiência premium do usuário e a integridade psicológica do produto.

Abaixo está o mapeamento detalhado de cada camada de decisão e atrito cognitivo.

---

## 🛠️ ANÁLISE DE DECISÃO (THE THREE KILLERS OF UX)

### 1. DECISÕES INCOERENTES & AMBIGUIDADE SEMÂNTICA (STATUS BUG)
> [!CAUTION]
> **O Bug da Inversão Cognitiva (Paid = Pausada)**
> A maior incoerência de fluxo e semântica reside na linha [57-81](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/subscriptions/page.tsx#L57-L81) na função `resolveSubscription`:
> ```typescript
> status: rem.paid ? 'pausada' : 'ativa',
> ```

* **O Problema**: O banco de dados armazena um boolean `paid` (se aquela recorrência específica foi paga no ciclo atual). O código mapeia `paid = true` para o status `"pausada"` e `paid = false` para o status `"ativa"`.
* **Impacto Psicológico (Dissonância Cognitiva Extrema)**:
  * Se o usuário quita a sua assinatura da Netflix para o mês atual, a interface exibe a Netflix com um badge cinza contendo um ícone de **Pause (⏸️)** e o texto **"pausada"**. O usuário instantaneamente sente pânico: *"Minha assinatura foi cancelada/pausada porque eu paguei? Perdi acesso ao serviço?"*
  * Se o usuário ainda não pagou a assinatura (`paid = false`), ela aparece com um badge verde contendo um ícone de **Play (▶️)** e o texto **"ativa"**. O usuário fica na dúvida: *"Se está ativa, significa que já foi debitada? Ou está pendente?"*
* **Friction Fix**: Corrigir a lógica de negócios. Uma assinatura recorrente é um objeto persistente cujo status de contrato (Ativa/Pausada) é independente do status de liquidação do ciclo atual (Paga/Pendente). Se o banco de dados só possui `paid`, a UI deve mapear isso como **"Paga"** (com checkmark/sucesso) ou **"Pendente"** (com alerta/calendário), mas NUNCA rotular uma conta paga como "Pausada".

---

### 2. DECISÕES DESNECESSÁRIAS & FREQUÊNCIAS ESTÁTICAS
* **O Problema**: A interface rotula rigidamente toda e qualquer recorrência como **"Mensal"** (linha [74](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/subscriptions/page.tsx#L74)):
  ```typescript
  frequency: 'Mensal',
  ```
* **Impacto Psicológico (Perda de Controle)**: O usuário perde a capacidade de cadastrar ou diferenciar recorrências anuais (ex: licenças de software, IPVA, seguros), semanais ou trimestrais. Forçar o usuário a ler "Mensal" em uma despesa que ele sabe que é anual gera ruído cognitivo e faz a aplicação parecer simplista ou inacabada.
* **Friction Fix**: Mapear o intervalo real de recorrência proveniente da tabela `reminders` ou inferido a partir dos dados do Gemini AI Brain, suportando dinamicamente frequências como `"Semanal"`, `"Mensal"`, `"Anual"`.

---

### 3. DECISÕES SEM INFORMAÇÃO SUFICIENTE (NEXT CHARGE AMBIGUITY)
> [!WARNING]
> **Falta de Contexto Temporal na Próxima Cobrança**
> Na linha [207-215](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/subscriptions/page.tsx#L207-L215), o bloco de "Próxima Cobrança" calcula a assinatura iminente:
> ```typescript
> {nextCharge ? `Dia ${nextCharge.day} • ${nextCharge.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '—'}
> ```

* **O Problema**: Se hoje é 27 de Maio e a próxima cobrança é no dia 5 (Junho), a interface exibe apenas **"Dia 5"**. 
* **Impacto Psicológico (Ansiedade de Data/Prazo)**: O usuário não sabe se o sistema está se referindo ao dia 5 de Maio (que já passou, gerando medo de atraso) ou ao dia 5 de Junho. A falta do nome do mês ou de um contador de dias relativos (ex: *"em 9 dias"*) força o cérebro do usuário a rodar cálculos de calendário mentalmente para obter clareza.
* **Friction Fix**: Adicionar o contexto do mês corrente ou calcular a data real da cobrança (ex: `05/06` ou `em 9 dias`) em vez de expor um número isolado e estático `"Dia X"`.

---

## 🎯 FRICTION POINTS & AFFORDANCE VIOLATIONS

### 1. A ILUSÃO DE INTERATIVIDADE (FALSE CLICK AFFORDANCE)
* **O Problema**: Cada card de assinatura na linha [229-232](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/subscriptions/page.tsx#L229-L232) está configurado com propriedades ricas de interação visual:
  ```tsx
  className={`... hover:scale-[1.02] transition-all duration-300 cursor-pointer group relative overflow-hidden`}
  ```
  O cursor muda para `pointer`, o card sofre escala física de `1.02`, e uma luz de fundo brilha ao passar o mouse.
* **Impacto de Fricção**: A interface grita para o usuário: *"Clique aqui para editar, pausar ou ver detalhes!"*. No entanto, **não existe qualquer handler de clique (`onClick`)** associado ao card.
* **Impacto Psicológico**: Sensação de que o software está quebrado, travado ou é apenas uma "maquete visual". O usuário tenta clicar repetidamente sem resposta.
* **Friction Fix**:
  * **Curto Prazo**: Remover a classe `cursor-pointer`, a escala e o hover de clique se a tela for estritamente estática.
  * **Longo Prazo (Premium)**: Adicionar um modal de detalhes com histórico de pagamentos daquela assinatura e a capacidade de pausar/reativar ou excluir o lembrete diretamente.

### 2. O BURACO NEGRO DE NAVEGAÇÃO (DEAD-END ON EMPTY STATE)
* **O Problema**: O Empty State da página (linha [155-167](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/subscriptions/page.tsx#L155-L167)) instrui o usuário a interagir via chat:
  ```text
  "... Você pode gerenciar e adicionar suas assinaturas através do Gemini AI Brain informando suas recorrências no chat!"
  ```
  No entanto, **não há nenhum botão ou link (CTA)** para abrir o chat, transicionar para a tela inicial onde o chat fica, ou disparar a barra de comando do assistente.
* **Impacto de Fricção (Dead-End)**: O usuário chega a uma tela vazia, lê uma instrução sobre o Gemini AI Brain, mas é deixado em um beco sem saída visual. Ele é obrigado a procurar atalhos de navegação para voltar.
* **Friction Fix**: Incluir um botão de ação proeminente no Empty State (ex: `[ Conversar com Gemini AI ]` ou `[ Adicionar Assinatura ]`) que redirecione ou abra a gaveta do chat instantaneamente.

---

## 🕳️ TRATAMENTO DE ERROS & INTEGRIDADE DE DADOS

### 1. FALSO VAZIO EM CASO DE ERRO (SILENT CRASH TO EMPTY STATE)
* **O Problema**: A chamada ao Supabase na linha [90-113](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/subscriptions/page.tsx#L90-L113) está envolvida em um bloco `try-catch` que silencia qualquer erro no console e apenas finaliza o loading:
  ```typescript
  } catch (err) {
    console.error('Error fetching reminders:', err);
  } finally {
    setLoading(false);
  }
  ```
* **Impacto de Fricção**: Se a conexão de internet cair ou a sessão expirar, o estado de `reminders` continua como um array vazio `[]`. O sistema então renderiza o **Empty State**, dizendo ao usuário que ele *"não possui assinaturas ativas"*.
* **Impacto Psicológico (Pânico de Perda de Dados)**: O usuário que possui 15 assinaturas cadastradas entra na página, ocorre um erro de rede temporário, e ele se depara com a mensagem dizendo que ele não tem nada cadastrado. Ele imediatamente assume que seus dados foram deletados do banco.
* **Friction Fix**: Criar um estado de erro explícito (`const [error, setError] = useState<string | null>(null)`). Se a requisição falhar, exibir uma tela de erro elegante com um botão de **"Tentar Novamente"** (Retry) em vez de mascarar a falha como uma lista vazia.

### 2. ANOMALIAS DE FUSO HORÁRIO (TIMEZONE DISCREPANCY BUGS)
* **O Problema**: Na linha [68](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/subscriptions/page.tsx#L68), o dia é extraído usando `getUTCDate()`:
  ```typescript
  const day = rem.due_date ? new Date(rem.due_date).getUTCDate() : 1;
  ```
  Mas na linha [302](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/subscriptions/page.tsx#L302), a verificação de "Hoje" no calendário é baseada na hora local do navegador:
  ```typescript
  const isToday = day === new Date().getDate();
  ```
* **Consequência Técnica**: Se o banco de dados salva a data como `YYYY-MM-DD` (ex: `2026-06-01`), dependendo de como o Next.js ou o navegador interpreta a string na hidratação, a conversão para `new Date()` pode assumir meia-noite UTC ou fuso horário local.
  * Se o fuso local do usuário for UTC-3 (Brasil) e a data for convertida localmente, `2026-06-01` vira `2026-05-31 21:00:00`.
  * Extrair `getUTCDate()` trará `1` (Junho), mas no fuso local o dia correspondente seria `31` (Maio). 
  * Isso faz com que a assinatura apareça no **dia errado no grid e no calendário**, gerando atrito e incerteza sobre a data real de vencimento dos boletos/faturas.
* **Friction Fix**: Padronizar toda a manipulação de datas na UI usando uma biblioteca robusta (como `date-fns` ou `dayjs`) ou garantir parsing seguro de strings de data sem timezone (ISO `YYYY-MM-DD`) para evitar deslocamento de fuso no lado do cliente.

---

## ⌛ LOADING & TRANSITION STATES (PERCEIVED PERFORMANCE)

### 1. SPINNER GENÉRICO E FRIO (LOADING REPROVADO)
* **O Problema**: A tela de carregamento na linha [151-154](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/subscriptions/page.tsx#L151-L154) utiliza um clássico spinner circular girando no centro de uma tela vazia:
  ```tsx
  <div className="flex justify-center items-center py-32">
    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-emerald-500"></div>
  </div>
  ```
* **Impacto de Fricção**: Spinners aumentam a percepção de tempo de espera. O cérebro do usuário foca no indicador girando e percebe a transição como "demorada". Isso não atende à restrição de design *World-Class*.
* **Friction Fix**: Substituir o spinner por **Shimmer Skeletons** simulando o grid de assinaturas e o calendário de cobrança. Isso prepara a mente do usuário para a estrutura do conteúdo e torna o carregamento psicologicamente imperceptível.

---

## 📊 COMPARATIVO DE FLUXO: IDEAL VS. REAL

```mermaid
graph TD
    subgraph Fluxo Atual (Alta Carga Cognitiva)
        A[Usuário entra na Página] --> B{Carregando Dados}
        B -->|Spinner Girando| C[Dificuldade de Percepção de Tempo]
        C --> D[Cards Exibidos]
        D -->|Hover ativo / Click inativo| E[Frustração de Affordance]
        D -->|Paid=True -> Exibe 'Pausada'| F[Dissonância Cognitiva Frequente]
        D -->|Dia sem fuso/mês| G[Incerteza sobre Data Real]
        D -->|Erro Ocorre| H[Lista Vazia Falsa / Pânico]
    end

    subgraph Fluxo Proposto (World-Class UX)
        A2[Usuário entra na Página] --> B2{Carregando Dados}
        B2 -->|Skeleton Shimmer| C2[Sensação de App Instantâneo]
        C2 --> D2[Cards Exibidos]
        D2 -->|Click Abre Modal de Detalhes| E2[Affordance Satisfeito]
        D2 -->|Paid=True -> Exibe 'Paga'| F2[Confirmação de Sucesso]
        D2 -->|Data com Fuso + Mês Claro| G2[Clareza Temporal Absoluta]
        D2 -->|Erro Ocorre| H2[Estado de Erro com Re-tentativa]
    end
    
    style B fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#fff
    style F fill:#7f1d1d,stroke:#f87171,stroke-width:2px,color:#fff
    style H fill:#7f1d1d,stroke:#f87171,stroke-width:2px,color:#fff
    style B2 fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#fff
    style F2 fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#fff
```

---

## 🏆 VEREDICTO DE UX FLUXO

### **VEREDICTO: OPTIMIZE & RESTRUCTURE**
A página possui uma excelente fundação estética e um calendário visual promissor, mas a lógica de decisões e affordances possui falhas estruturais severas. 

1. **A inversão semântica de `paid` para `pausada` é um showstopper de UX** que precisa ser corrigido imediatamente para restabelecer a confiança do usuário no controle financeiro.
2. **Os cards que fingem interatividade** sem realizar ações e o **Empty State sem CTA** transformam o fluxo em um labirinto frustrante.
3. **O carregamento com spinner genérico e a falta de tratamento de erro** rebaixam o app de "World-Class" para um template comum.

Com a aplicação imediata dos ajustes de fluxo propostos, esta página saltará para o mais alto padrão de sofisticação e engenharia de experiência do usuário exigido pelo ecossistema **G-Finance**.

---
*Relatório de Psicologia e Fluxo de UX gerado por Antigravity AI.*
