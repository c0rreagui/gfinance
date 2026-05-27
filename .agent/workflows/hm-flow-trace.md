---
description: Rastrear e auditar o fluxo completo (Ideal vs Real) de uma feature ou página, construindo um mapa neural de estados
---

# /hm-flow-trace — Mapeamento Neural & Rastreamento de Fluxo (v1)

Você está agora no **modo Flow Trace**. Sua missão é documentar, auditar e mapear exaustivamente a jornada técnica e de experiência do usuário de uma página ou feature. 

Esta skill serve para consolidar um **Mapa Neural** robusto do produto, garantindo que tenhamos 100% de visibilidade de cada canto do sistema. Você deve comparar de forma implacável o fluxo **Ideal** (especificação de design e intenção funcional) com o fluxo **Real** (comportamento empírico observado no código e no navegador).

---

## 🧠 O Princípio do Padrão Premium

Um sistema de excelência mundial (*world-class*) não possui cantos escuros. Cada fluxo, transição de estado, efeito colateral e persistência em banco de dados deve ser conhecido, previsível e intencional. O objetivo final do `/hm-flow-trace` é construir uma wiki neural no Obsidian que sirva de guia definitivo para engenharia, design e produto, eliminando regressões de código e fricções de negócio.

---

## 🛠️ Protocolo de Execução em 7 Passos

### Passo 0: Configuração de Escopo, Personas e Eixos

Antes de iniciar a análise, você deve definir as premissas do trace:
1. **Nome da Feature / Página:** O escopo exato do trace (ex: `/prisma`, `/analytics`, etc.).
2. **Definição de Personas (Mínimo de 2 obrigatórias):**
   - **First-Time User (Zero State):** Cache limpo, sem sessão de autenticação ativa, onboarding completo pendente, visualização de *empty states*. Alta probabilidade de abandono.
   - **Steady-State User (Regular User):** Sessão ativa, cookies/tokens populados, banco contendo dados reais, atalhos rápidos e uso rotineiro.
3. **Eixos de Otimização (Definir 1 Primário + 1 Secundário):**
   - *Conversion* (conversão de etapas e finalização do fluxo)
   - *Speed & Latency* (tempo de carregamento das telas, queries otimizadas)
   - *Cognitive Clarity* (remoção de ruído, clareza editorial)
   - *Resilience & Recovery* (tolerância a falhas, botões de desfazer)
   - *Developer Experience (DX)* (manutenibilidade, tipagem estrita)

---

### Passo 1: Cenário 1 — Análise Estática (Código e Arquitetura)

Antes de abrir o navegador, mergulhe no código-fonte usando ferramentas de leitura de arquivo:
- Mapeie as rotas do Next.js (App Router ou Pages Router).
- Identifique os endpoints de API internos e as chamadas de serviços externos.
- Analise os schemas de validação (ex: Zod) e os modelos de dados.
- Audite as regras de segurança e políticas do banco de dados (Supabase RLS).

---

### Passo 2: Cenário 2 — Execução Empírica (Browser Control)

Valide o comportamento em tempo de execução real. 
- Para o servidor local (Synapse/G-Finance): utilize o **Preview MCP**.
- Para plataformas externas integradas (TikTok, Twitch, YouTube, dashboards de produção) e navegação geral: utilize a **skill `/browser` do Antigravity** e o **chrome-devtools-plugin** integrado.

> [!CAUTION]
> **Salvaguarda de Navegação (/browser & chrome-devtools-plugin):**
> 1. A skill **`/browser`** controla o navegador físico e real do usuário em sua sessão ativa. Nunca realize ações destrutivas, exclusões acidentais ou automações em massa que possam ser interpretadas como spam ou bot pelas plataformas, sob risco de **banimento de sua conta real**.
> 2. Devido à limitação física de uma única instância ativa de browser, **nunca execute múltiplos subagentes controlando o browser de forma paralela**. Enfileire as ações empíricas sequencialmente.

#### Protocolo de Estados por Step
Para cada step do fluxo empírico, destile as seguintes 5 dimensões:
1. **Input:** Ações diretas do usuário (cliques, inputs de texto, arquivos arrastados, payloads manuais).
2. **System:** Resposta imediata do cliente (estados do React, cache de query, gravação em localStorage, cookies de sessão).
3. **Output:** Feedback visual em tela (mudança de rota, micro-animações, shimmers, toasts).
4. **Side Effects:** Efeitos colaterais (escritas no banco Supabase, requisições fetch de terceiros, disparos de webhooks).
5. **Backstage:** Processamento assíncrono profundo (background tasks, filas de mensageria, agentes autônomos processando em paralelo).

#### Marcadores de Divergência
Ao mapear a tabela comparativa, use os seguintes marcadores de precisão:
- `=` **Correspondência Perfeita:** Ideal == Real.
- `~` **Leve Desvio:** Comportamento ligeiramente diferente, lag insignificante ou variação textual simples.
- `!=` **Gargalo Funcional:** Diferença significativa entre a especificação teórica e a execução prática.
- `??` **Especulativo/Desconhecido:** Comportamento que não pôde ser verificado empiricamente e precisa de validação de terceiros.
- `XX` **Blocker Crítico:** Falha grave que impede a progressão do fluxo (erro 500, violação de RLS, travamento da UI).

---

### Passo 3: Mapeamento de Fricção, Erro e Drop-off

Não relate falhas genericamente como "erro de rede". Crie **Hipóteses de Drop-off** específicas focadas na carga mental e usabilidade:
- "Usuário desiste nesta etapa porque o botão de upload não possui indicação visual de progresso e parece travado."
- "O usuário desiste porque a solicitação de dados sensíveis ocorre antes de justificarmos o valor da integração."

#### Severidade × Confiança = Bloqueante
- **Confidence Rating:** *Verified* (provado empiricamente) | *Inferred* (baseado no código-fonte) | *Speculative* (hipótese teórica).
- Se a severidade de um problema for **Critical** ou **High** E a confiança for **Verified** ou **Inferred**, classifique-o imediatamente como **[BLOCKER]** no sumário do trace.

---

### Passo 4: Otimização e Custo de Implementação

Com base nos eixos definidos no Passo 0, desenhe a engenharia de solução para os gargalos mapeados.
- Cada recomendação de correção ou otimização deve conter uma estimativa de **Custo de Implementação:**
  - **S (Small):** Ajuste estético, mudança de microcopy, pequenos ajustes de CSS, adição de shimmer. (<2h de trabalho)
  - **M (Medium):** Refatoração de componente de UI, adição de validações com Zod, ajuste simples em políticas de banco. (2h - 6h de trabalho)
  - **L (Large):** Mudança arquitetural, criação de novas tabelas de banco, integrações externas pesadas, mudanças profundas de roteamento. (>6h de trabalho)

---

### Passo 5: Phantom Flow Detection (Rotas Mortas)

Pesquise ativamente no codebase por caminhos fantasmas:
- Rotas órfãs ou arquivos de rotas não indexados pelo menu de navegação.
- Endpoints de API obsoletos que continuam recebendo tráfego ou existindo na pasta `/api`.
- Componentes inativos e código morto que poluem o bundle do cliente.

---

### Passo 6: Persistência do Mapa Neural

Todos os traces devem ser consolidados e salvos no diretório Obsidian Wiki do projeto:
`d:\APPS - ANTIGRAVITY\G-Finance\.agent\wiki\traces/flow_<page_or_feature>.md`

#### Frontmatter Obrigatório do Trace:
```yaml
---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Nome do Fluxo/Página"
date_created: YYYY-MM-DD
primary_axis: "Eixo Primário"
secondary_axis: "Eixo Secundário"
blockers_found: N
phantom_paths_detected: N
---
```

---

## 📋 Modelo de Output do Trace

O arquivo final do trace deve seguir esta estrutura estrita:

```markdown
# Flow Trace: [Nome da Página/Feature]

## 📊 Visão Geral do Fluxo
- **Páginas Afeitas:** [Caminhos das rotas afetadas]
- **Persona Analisada:** [First-Time ou Steady-State]
- **Eixo Primário:** [Eixo] | **Eixo Secundário:** [Eixo]

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | First-Time | Acessa a página `/prisma` e visualiza o empty state com botão de ação. | Exibe skeleton por 800ms, em seguida renderiza empty state sem animação. | `~` | Verified | Baixa atração visual do botão. |
| **2** | Steady-State| Clica em sincronizar e visualiza progresso em tempo real. | Botão trava em "Carregando" sem barra de progresso. Chamada API N+1. | `!=` | Verified | **[BLOCKER]** Ansiedade por falta de loading state claro. |

---

## 🔬 Detalhamento de Estados por Step

### Step [N]: [Nome do Step]
- **Input:** `[Ação do usuário]`
- **System:** `[React State / Local Storage]`
- **Output:** `[Feedback visual em tela]`
- **Side Effects:** `[Supabase writes, API calls]`
- **Backstage:** `[Queue processing, background logs]`

---

## 👻 Phantom Flows Detectados
- **[Caminho/Arquivo]:** Descrição do código morto ou rota inacessível pela interface.

---

## ⚡ Recomendações e Plano de Correção

| Categoria | Gargalo / Fricção Identificada | Solução Proposta | Custo (S/M/L) |
| :--- | :--- | :--- | :--- |
| **UI/UX** | Falta de loading indicator no step 2 | Adicionar loader OKLch animado | **S** |
| **Database** | Query N+1 na sincronização | Otimizar com inner join e índice no Supabase | **M** |

---

## 🏓 Handoff de Especialistas
- **Para /hm-ux-flow:** [Link para aprofundar na jornada de decisão do usuário]
- **Para /hm-qa:** [Link ou script de teste para validar a concorrência na query]
- **Para /hm-designer:** [Diretrizes de alinhamento visual do novo loader animado]
- **Para /hm-performance:** [Mapeamento de latência e otimização de bundle]
```

---

## 🚫 Regras Inegociáveis

1. **Capacidade Máxima de Passos:** Um trace de fluxo deve conter no máximo **15 passos**. Se o fluxo for maior que 15 passos, divida-o em sub-fluxos separados (ex: `/settings_onboarding` e `/settings_profile`).
2. **Prosa de Alta Qualidade:** Evite jargões corporativos genéricos. Seja preciso, técnico e focado no design de excelência.
3. **Mapeamento de Estados Completo:** Não ignore os Side Effects ou o Backstage. Um fluxo não acontece apenas na tela do usuário.
4. **Sem placeholders:** Todos os traces devem conter dados reais baseados no codebase atual da aplicação.
