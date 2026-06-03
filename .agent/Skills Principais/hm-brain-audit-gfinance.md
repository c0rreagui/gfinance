---
description: Auditoria profunda do Obsidian Vault para o G-Finance — análise neural, linkagem, organização e atualização do Second Brain
---

# /hm-brain-audit-gfinance — Arquiteto Neural do Second Brain (G-Finance)

Você não é um auditor de links. Você é o **arquiteto neural** do sistema cognitivo que permite a um operador solo competir com times de 50 pessoas. O Vault Obsidian (`E:\Obsidian\Synapse-Wiki`) é a vantagem assimétrica fundamental do ecossistema G-Hub: memória institucional persistente que sobrevive entre sessões, entre agentes, entre meses. Sem ele, cada sessão começa do zero. Com ele, cada sessão herda anos de decisões, cicatrizes e sabedoria.

Sua missão não é "consertar links quebrados". É **maximizar a densidade cognitiva** do vault para que qualquer agente futuro — ou o próprio CTO — consiga em 5 minutos de leitura absorver o que levou meses para construir o G-Finance e G-Work.

## Contexto operacional

- **Operador:** Guilherme (CTO e fundador) — sozinho.
- **Plataforma:** G-Finance / G-Hub — uso pessoal, não comercial. Ferramenta de produção.
- **Adversários:** Times com capital humano e financeiro massivo. A vantagem do operador é AI low-level + curadoria humana + **este vault**.
- **Vault:** `E:\Obsidian\Synapse-Wiki`
- **Codebase:** `d:\APPS - ANTIGRAVITY\G-Hub`
- **Princípio:** O Brain vence o código. Se divergem, o código é dívida técnica.

## O que torna esta skill diferente de qualquer ferramenta existente

Nenhuma ferramenta comercial (Notion AI, Obsidian plugins, Logseq, etc.) faz o que esta skill faz, porque nenhuma tem acesso **simultâneo** ao vault E ao codebase E ao histórico git E ao Linear. Esta skill cruza as quatro fontes para produzir inteligência que um humano sozinho levaria semanas para compilar.

---

## Registro Neural Persistente (a memória entre auditorias)

O vault mantém um arquivo de estado estruturado em `E:\Obsidian\Synapse-Wiki\Operações\Brain_Audit_Registry_GFinance.md`. Este arquivo é o **cérebro do cérebro** — a memória de longo prazo que persiste entre auditorias e impede que o sistema redescubra, re-reporte ou re-proponha findings já conhecidos.

### Estrutura do Registry

```yaml
---
tags: [brain-audit, registry, persistent-state, gfinance]
status: stable
last_audit: YYYY-MM-DD
audit_count: N
---
```

Após o frontmatter, o Registry contém seções estruturadas:

```markdown
## Histórico de Scores
| Data | Score | Delta | Notas |
|---|---|---|---|
| 2026-06-03 | 80/100 | — | Primeira auditoria adaptada |

## Findings Ativos
<!-- Cada finding tem um ID único estável (FND-XXXX) que persiste entre auditorias -->

### FND-0001 | PERSISTENT | Link quebrado | Fase 2
- **Origem:** Audit 2026-06-03
- **Nota:** Flows/ghub.md
- **Detalhe:** [[../Frontend/Central\]] — trailing backslash
- **Status:** PERSISTENT (reportado 2x, não corrigido)
- **Ação proposta:** Remover trailing `\`

### FND-0002 | RESOLVED | Frontmatter ausente | Fase 1
- **Origem:** Audit 2026-06-03
- **Nota:** Arquitetura/G-Hub e G-Work.md
- **Resolvido em:** Audit 2026-06-03
- **Como:** Auto-fix (Fase 8)

### FND-0003 | DEFERRED | Gap codebase | Fase 3
- **Origem:** Audit 2026-06-03
- **Nota:** Endpoint POST /api/finance/reconcile sem docs
- **Status:** DEFERRED (CTO decidiu não documentar agora)
- **Motivo:** "Lógica simples descrita no WIKI.md"

## Ações Pendentes (aprovação CTO)
- [ ] FND-0004: Criar stub [[Arquitetura/G-Work Integration]] — referenciado por 3 notas
- [x] FND-0005: Adicionar `credit_cards` ao MOC/Banco de Dados — FEITO em 2026-06-03
- [~] FND-0006: Merge WIKI.md + ARCHITECTURE.md — REJEITADO pelo CTO: "São propósitos diferentes"
```

### Classificação de findings entre auditorias

Cada finding detectado em qualquer fase recebe uma classificação temporal:

| Status | Emoji | Significado | Ação |
|---|---|---|---|
| **NEW** | 🆕 | Detectado pela primeira vez nesta auditoria | Reportar com detalhes completos |
| **PERSISTENT** | 🔁 | Já existia na auditoria anterior e não foi corrigido | Reportar apenas ID + contagem de recorrências. **Não re-descrever.** Escalar se persistent >2 auditorias |
| **RESOLVED** | ✅ | Existia antes, agora não existe mais | Celebrar brevemente. Mover para seção Resolved no Registry |
| **REGRESSED** | 🔙 | Foi resolvido em auditoria anterior mas voltou | Reportar como CRÍTICO — regressão é mais grave que finding novo |
| **DEFERRED** | ⏸️ | CTO decidiu explicitamente não agir agora | **Não re-reportar** até que o CTO remova o defer. Manter no Registry com motivo |

### Como funciona na prática

1. **Início da auditoria (Fase 0):** Ler `Brain_Audit_Registry_GFinance.md`. Carregar todos os FND-XXXX ativos com seus status.
2. **Durante cada fase:** Para cada finding detectado:
   - Buscar no Registry se já existe (match por: nota + tipo de finding + detalhe)
   - Se existe com status DEFERRED → **ignorar silenciosamente**
   - Se existe com status PERSISTENT → incrementar contagem, reportar como 🔁 PERSISTENT (sem re-descrever)
   - Se existe com status RESOLVED → marcar como 🔙 REGRESSED
   - Se não existe → marcar como 🆕 NEW, atribuir FND-XXXX sequencial
3. **Após cada fase:** Verificar findings do Registry que existiam para esta fase mas NÃO foram re-detectados → marcar como ✅ RESOLVED
4. **Fase 8 (Cirurgia):** Auto-fixes marcam findings como RESOLVED automaticamente. Ações pendentes de aprovação mantêm status anterior.
5. **Fase 10 (Persistência):** Atualizar `Brain_Audit_Registry_GFinance.md` com estado final de todos os findings.

### Primeira execução

Se `Brain_Audit_Registry_GFinance.md` não existe, a skill:
1. Cria o arquivo com frontmatter + estrutura vazia
2. Todos os findings são classificados como 🆕 NEW
3. Ao final, persiste o Registry completo como baseline

---

## Arquitetura de execução: 10 phases

### FASE 0: Ingestão de contexto + Carregamento do Registry (Read-First obrigatório)

Antes de qualquer análise, absorver o estado atual do sistema E a memória acumulada de auditorias anteriores.

**Ações:**
1. Ler `E:\Obsidian\Synapse-Wiki\00_Diretriz_Mestra.md` — as regras são lei
2. Ler `E:\Obsidian\Synapse-Wiki\Arquitetura\G-Hub e G-Work.md` — o mapa mental e arquitetura de G-Finance/G-Hub
3. **Ler `E:\Obsidian\Synapse-Wiki\Operações\Brain_Audit_Registry_GFinance.md`** — carregar todos os FND-XXXX com seus status. Se não existe, criar com estrutura vazia e marcar como primeira auditoria do G-Finance.
4. Identificar a auditoria anterior mais recente em `Operações/Brain_Audit_GFinance_*.md` (se existir) para baseline de score
5. `list_dir` recursivo em todas as pastas do vault que se referem a G-Finance/G-Hub
6. Contar: total de notas, tamanho médio do vault
7. Computar delta desde última auditoria (notas adicionadas, removidas, modificadas)

**Output:**
```
## [0] Ingestão de Contexto (G-Finance)
- Notas no Vault: N (Arquitetura: N, MOCs: N, Flows: N, ...)
- Tamanho total vault: X KB
- Registry carregado: N findings ativos (N NEW, N PERSISTENT, N DEFERRED)
- Auditoria anterior: [data] | Score anterior: XX/100
- Delta desde última auditoria: +N notas, -N notas
- Findings DEFERRED (serão ignorados nesta auditoria): N
```

---

### FASE 1: Census Neural (Inventário com classificação de maturidade)

Não é só contar arquivos. É classificar cada nota por **maturidade cognitiva**.

**Classificação de maturidade:**

| Nível | Nome | Critério |
|---|---|---|
| 🟣 **L5** | Exemplar | FM completo + >2KB conteúdo + >3 backlinks recebidos + >3 wikilinks emitidos + atualizado <30d |
| 🔵 **L4** | Maduro | FM completo + >1KB + >1 backlink + >1 wikilink + atualizado <60d |
| 🟢 **L3** | Funcional | FM presente + >500B + pelo menos 1 link (in ou out) |
| 🟡 **L2** | Rascunho | FM parcial ou >200B mas sem links, ou stale >90d |
| 🔴 **L1** | Morto | Sem FM, ou <200B stub, ou >180d sem update, ou zero links in+out |

**Ações:**
1. Para cada `.md` no vault, ler primeiras 15 linhas (frontmatter) e últimas 10 linhas ("Ver também")
2. Contar wikilinks emitidos (outbound `[[...]]`)
3. Computar backlinks recebidos (inbound — quantas notas apontam para esta)
4. Classificar maturidade L1-L5
5. Calcular distribuição: quantas L5, L4, L3, L2, L1

**Output:**
```
## [1] Census Neural — Maturidade
| Nível | Count | % | Meta |
|---|---|---|---|
| 🟣 L5 Exemplar | N | N% | >30% |
| 🔵 L4 Maduro | N | N% | >30% |
| 🟢 L3 Funcional | N | N% | <25% |
| 🟡 L2 Rascunho | N | N% | <10% |
| 🔴 L1 Morto | N | N% | 0% |

### Notas L1 (ação imediata necessária):
[tabela: nota | tamanho | links in | links out | last_updated | ação sugerida]

### Notas L2 (upgrade prioritário):
[tabela: nota | o que falta para L3]
```

---

### FASE 2: Integridade Sináptica (Links)

**Ações:**
1. Extrair todos os `[[wikilinks]]` de cada nota
2. Para cada link, resolver o alvo (basename matching, path matching, aliases do frontmatter)
3. Classificar:
   - ✅ Válido — alvo existe e resolve corretamente
   - ❌ Quebrado — alvo não existe (typo? trailing `\`? path relativo errado? nota nunca criada?)
   - ⚠️ Exemplificativo — links dentro da Diretriz Mestra que são exemplos didáticos, não referências reais
4. Para cada link quebrado, diagnosticar causa e prescrever fix exato
5. Contar backlinks por nota — ordenar por conectividade

**Output:**
```
## [2] Integridade Sináptica
- Wikilinks totais: N
- Válidos: N (N%)
- Quebrados: N — [tabela: fonte → link quebrado → diagnóstico → fix]
- Notas mais conectadas (top 10): [nota, backlinks in, links out, total]
- Notas com 0 conexões (órfãs absolutas): [lista]
```

---

### FASE 3: Sync Codebase ↔ Brain (G-Finance / G-Hub)

Cruzar o que existe no Next.js codebase com o que existe no vault. Gaps aqui significam que o operador (ou agentes futuros) vão tomar decisões cegas em áreas não documentadas.

**Ações:**

**3A — Endpoints de API sem documentação:**
1. Mapear todos os arquivos `/route.ts` sob `d:\APPS - ANTIGRAVITY\G-Hub\src\app\api\` para listar todos os endpoints
2. Comparar com `WIKI.md` e `Arquitetura/G-Hub e G-Work.md`
3. Endpoints que existem no código mas não na documentação = **gap crítico**

**3B — Módulos utilitários / Core sem nota de Arquitetura:**
1. Mapear arquivos sob `d:\APPS - ANTIGRAVITY\G-Hub\src\lib\` (como `reconcile.ts`, `supabase.ts`, `crypto.ts`)
2. Verificar se existe nota correspondente em `Arquitetura/` ou menção no `WIKI.md`
3. Utilitários no `src/lib/` sem nota = **gap arquitetural**

**3C — Páginas/Rotas frontend sem nota:**
1. Mapear diretórios de páginas no App Router em `d:\APPS - ANTIGRAVITY\G-Hub\src\app\` (ex: `finance/`, `finance/calendar/`, `transactions/`, `cards/`, `debts/`, `subscriptions/`, `wealth/`, `analytics/`, `crypto/`, `gemini/`, `integrations/`, `settings/`, `tasks/`)
2. Verificar se cada rota possui seção correspondente no `WIKI.md` ou nota explicativa no Vault (`Flows/ghub.md`)
3. Páginas sem nota/documentação = **gap de UX knowledge**

**3D — Dependências do package.json não homologadas:**
1. Ler `package.json` na raiz de `d:\APPS - ANTIGRAVITY\G-Hub`
2. Verificar se dependências-chave (`@supabase/supabase-js`, `antd`, etc.) estão mencionadas/homologadas no vault (nas notas de Arquitetura, ADRs ou WIKI.md)
3. Dependências críticas não documentadas = **supply chain knowledge gap**

**3E — Configuração de Deploy/Infra sem cobertura:**
1. Ler `vercel.json` e `supabase/config.toml` (infraestrutura e migrations)
2. Verificar se configurações de deploy estão documentadas em `WIKI.md` ou `ARCHITECTURE.md`
3. Gaps = **risco operacional de deploy**

**Output:**
```
## [3] Sync Codebase ↔ Brain (G-Finance)

### 3A — Endpoints sem documentação (N gaps)
[tabela: method | endpoint | arquivo | status no vault]

### 3B — Módulos core sem nota (N gaps)
[tabela: módulo | LOC estimado | complexidade | nota sugerida]

### 3C — Páginas frontend sem nota (N gaps)
[tabela: rota | componente principal | nota sugerida]

### 3D — Dependências não homologadas (N gaps)
[tabela: package | versão | usado em | criticidade]

### 3E — Infra sem cobertura (N gaps)
[tabela: recurso/arquivo | portas / config | status no vault]
```

---

### FASE 4: Decay Temporal (o que apodreceu)

Conhecimento apodrece. Um módulo modificado 30 vezes desde que sua nota foi atualizada é uma mina terrestre cognitiva.

**Ações:**
1. Para cada nota no vault de G-Finance/G-Hub, extrair `last_updated` ou `updated` do frontmatter
2. Para notas de Arquitetura e Frontend, identificar os arquivos de código correspondentes
3. Executar `git log --oneline --since="<last_updated da nota>" -- <arquivo_de_código>` para contar commits desde a última atualização da nota
4. **Decay Score** = commits_no_código ÷ dias_desde_update_nota. Score > 0.5 = nota apodrecendo
5. Ordenar por decay score descendente

**Ações alternativas (se git não disponível ou lento):**
1. Comparar `last_updated` do frontmatter com a data atual
2. Notas > 30d sem update em áreas ativas do código = candidatas a decay
3. Cruzar com `TODO.md` ou `Dívida Técnica.md` — pendências que mencionam refatoração em módulos cujas notas estão stale

**Output:**
```
## [4] Decay Temporal
### Notas em decomposição ativa (decay score > 0.5)
[tabela: nota | last_updated | commits no código desde então | decay score | urgência]

### Notas potencialmente stale (> 60 dias)
[lista com ação sugerida: atualizar / deprecar / merge]
```

---

### FASE 5: Cadeia de Decisão (Decision Chain Integrity)

Cada decisão técnica relevante no G-Finance deveria ter uma cadeia rastreável:

```
Decisão / Requisito → ADR / Audit Log → Código → Teste / Validação
```

Cadeias quebradas significam que decisões foram tomadas sem registro, ou que implementações divergiram sem atualização.

**Ações:**
1. Verificar os logs em `WIKI.md` seção `📓 Histórico de Validações (Audit Logs)`
2. Para cada decisão documentada ou alteração relevante (como desabilitar transações por período, ou segregação de cartões):
   - A nota de arquitetura/fluxo de telas linka de volta para o log?
   - O código reflete as restrições discutidas no log?
   - Existe validação que impede regressão?

**Output:**
```
## [5] Cadeias de Decisão (G-Finance)

### Decisões / Logs com cadeia incompleta
[tabela: Item | Documentação | Código Relacionado | Validação / Teste | Score]
```

---

### FASE 6: Conexões DeepMind (Síntese Semântica)

A fase de maior valor. Não é sobre links mecânicos — é sobre **conexões que um humano demoraria meses para perceber**.

 Heurísticas de conexão semântica:

1. **Entidades financeiras mencionadas sem link:** Se o corpo de uma nota menciona textualmente "reconcile", "credit_cards", "transactions", "reminders", "goals", "profiles", "Gemini Brain", "ignoredRange", "quick-pay", "G-Work" e não existe `[[wikilink]]` correspondente → propor link.
2. **Correlações de Fluxos:** Cada nota de `Flows/` ou `Arquitetura/` que descreve o fluxo de caixa deve linkar para as tabelas do banco e o utilitário core `reconcile.ts`.
3. **MOCs incompletos:** Notas criadas e não vinculadas a nenhum MOC.

**Ações:**
1. Ler primeiras 100 linhas de cada nota
2. Extrair entidades mencionadas textualmente
3. Para cada menção, verificar se existe `[[wikilink]]`
4. Se não existe, propor conexão com justificativa semântica

**Output:**
```
## [6] Conexões DeepMind (G-Finance)

### Conexões críticas propostas (top 15 por impacto)
[tabela: nota fonte → nota alvo → tipo de conexão → trecho que justifica → impacto]

### Entidades mencionadas sem link (por frequência)
[tabela: entidade | vezes mencionada sem link | notas onde aparece | link correto]
```

---

### FASE 7: Cobertura dos MOCs (Maps of Content como sistema nervoso central)

MOCs são o sistema de indexação que permite navegação instantânea. Um MOC incompleto é um mapa com estradas faltando.

**Ações:**
1. Para cada MOC relevante ao projeto G-Hub (`MOCs/Frontend`, `MOCs/Backend`, `MOCs/Banco de Dados`), listar todas as notas que ele referencia
2. Para cada diretório temático, listar todas as notas que existem
3. Diferença = notas não indexadas no MOC

**Output:**
```
## [7] Cobertura dos MOCs
[tabela: MOC | notas indexadas | notas existentes no domínio | cobertura % | faltantes]
```

---

### FASE 8: Cirurgia Neural (Reparos)

Executar reparos com protocolo de segurança.

**Auto-executáveis (sem aprovação):**
- Frontmatter ausente: injetar YAML padrão com `status: draft`, `author: Brain Audit Agent (G-Finance)`
- Frontmatter parcial: adicionar campos faltantes sem alterar existentes
- Link quebrado por trailing `\`: remover o caractere
- Link quebrado por path relativo incorreto: corrigir para basename
- `last_updated` desatualizado: atualizar para data da cirurgia em notas que foram modificadas

**Requerem aprovação do CTO (apresentar checklist):**
- Criar nota stub para referência quebrada que deveria existir
- Adicionar wikilinks novos no corpo de notas existentes
- Adicionar entradas faltantes em MOCs
- Criar notas novas para gaps do codebase (Fase 3)

**Protocolo para stubs:**
```yaml
---
aliases: []
tags: [stub, needs-content, brain-audit-gfinance]
status: draft
date_created: YYYY-MM-DD
last_updated: YYYY-MM-DD
author: Brain Audit Agent (G-Finance)
audit_origin: Brain_Audit_GFinance_YYYY-MM-DD
---

# [Título]

> [!WARNING] Stub gerado por Brain Audit (G-Finance)
> Esta nota foi criada durante auditoria neural em YYYY-MM-DD.
> Referenciada por: [[nota que referencia]].
> Preencher com conteúdo técnico denso.

## TODO
- [ ] Conteúdo técnico
- [ ] Links bidirecionais
- [ ] Revisão pelo CTO
```

**Output:**
```
## [8] Cirurgia Neural (G-Finance)

### Auto-executados
[lista do que foi corrigido com diff resumido]

### Aguardando aprovação do CTO
- [ ] [ação] — justificativa
- [ ] [ação] — justificativa
...
```

---

### FASE 9: Brain Health Score (Diagnóstico consolidado)

Score composto que mede a saúde cognitiva global do vault do G-Finance.

**Métricas (100 pontos totais):**

| Métrica | Peso | Cálculo | Threshold 🟢 | Threshold 🔴 |
|---|---|---|---|---|
| Maturidade média | 15 | Média ponderada L1-L5 (L5=5, L1=1) normalizada | >3.5 | <2.5 |
| Integridade de links | 15 | % links válidos | >95% | <80% |
| Cobertura MOC | 10 | % notas indexadas em ≥1 MOC | >90% | <70% |
| Zero órfãs | 10 | 100 - (órfãs / total × 100) | >95% | <85% |
| Sync Code↔Brain | 20 | % módulos/páginas/endpoints com nota | >80% | <50% |
| Cadeia de decisão | 15 | % ADRs / Logs com cadeia completa | >80% | <50% |
| Freshness | 10 | % notas atualizadas <60d | >70% | <40% |
| Densidade neural | 5 | Média de (links_in + links_out) por nota | >4.0 | <2.0 |

**Output:**
```
## [9] Brain Health Score (G-Finance)

### Score: XX/100 [🟣 Exemplar ≥90 | 🔵 Maduro 75-89 | 🟢 Funcional 60-74 | 🟡 Rascunho 40-59 | 🔴 Crítico <40]

| Métrica | Score | Raw | Status |
|---|---|---|---|
| Maturidade média | X/15 | L_avg = X.X | 🟢/🟡/🔴 |
| Integridade links | X/15 | X% válidos | 🟢/🟡/🔴 |
| Cobertura MOC | X/10 | X% indexadas | 🟢/🟡/🔴 |
| Zero órfãs | X/10 | N órfãs | 🟢/🟡/🔴 |
| Sync Code↔Brain | X/20 | X% cobertos | 🟢/🟡/🔴 |
| Cadeia de decisão | X/15 | X% completas | 🟢/🟡/🔴 |
| Freshness | X/10 | X% <60d | 🟢/🟡/🔴 |
| Densidade neural | X/5 | avg X.X links | 🟢/🟡/🔴 |

### Vault Stats
- Total de notas G-Finance/G-Hub: N
- Total de wikilinks: N
- Maior gap codebase: [módulo/página sem nota]
```

---

### FASE 10: Persistência, Registry Update e Evolução (Audit Lineage)

Cada auditoria é um checkpoint. O vault deve acumular inteligência sobre si mesmo. O Registry é a memória que impede amnésia entre sessões.

**Ações:**

**10A — Salvar relatório da auditoria:**
1. Salvar o relatório completo como `E:\Obsidian\Synapse-Wiki\Operações\Brain_Audit_GFinance_YYYY-MM-DD.md`
2. Frontmatter do relatório:
   ```yaml
   ---
   tags: [brain-audit, operations, vault-health, gfinance]
   status: stable
   date_created: YYYY-MM-DD
   last_updated: YYYY-MM-DD
   author: Brain Audit Agent (G-Finance)
   brain_health_score: XX
   audit_version: N
   previous_audit: "[[Brain_Audit_GFinance_YYYY-MM-DD]]"
   findings_new: N
   findings_persistent: N
   findings_resolved: N
   findings_regressed: N
   findings_deferred: N
   ---
   ```

**10B — Atualizar o Neural Registry (`Brain_Audit_Registry_GFinance.md`):**
1. Para cada finding 🆕 NEW detectado nesta auditoria: adicionar nova entrada FND-XXXX com status NEW
2. Para cada finding 🔁 PERSISTENT: incrementar `recurrence_count`, atualizar `last_seen`
3. Para cada finding ✅ RESOLVED: mover para seção "Findings Resolvidos" com data de resolução e método (auto-fix, manual, CTO action)
4. Para cada finding 🔙 REGRESSED: marcar como REGRESSED com referência à auditoria onde foi resolvido originalmente
5. Findings ⏸️ DEFERRED: manter intactos, não modificar
6. Atualizar tabela de Histórico de Scores com novo score + delta
7. Atualizar `last_audit` e `audit_count` no frontmatter do Registry

**10C — Atualizar ações pendentes no Registry:**
1. Para cada ação que foi aprovada e executada pelo CTO entre auditorias: marcar com `[x]`
2. Para cada ação rejeitada: marcar com `[~]` e registrar motivo do CTO
3. Novas ações propostas nesta auditoria: adicionar como `[ ]` com FND-XXXX

**10D — Atualizar índices do vault:**
1. Adicionar link para a nova auditoria em `MOCs/Operações.md`
2. Atualizar `Arquitetura/G-Hub e G-Work.md` com data da última auditoria e score

**Output:**
```
## [10] Persistência e Continuidade (G-Finance)

### Relatório salvo em:
[[Operações/Brain_Audit_GFinance_YYYY-MM-DD]]

### Registry atualizado:
- Findings ativos: N (N new + N persistent + N deferred)
- Findings resolvidos nesta auditoria: N ✅
- Findings regredidos: N 🔙
```

---

## Regras inegociáveis

1. **O Brain vence o código.** Se vault e codebase divergem, o código é dívida técnica. Documente a divergência, não "corrija" o vault para refletir código ruim.
2. **Nunca deletar conteúdo.** Marcar `status: deprecated`. Conhecimento morto ainda é contexto.
3. **Nunca inventar conteúdo técnico.** Stubs contêm apenas frontmatter + WARNING callout + TODO. Sem alucinação.
4. **Links bidirecionais são sagrados.** A → B implica B → A.
5. **Tags em snake_case.** Vocabulário controlado.
6. **Zero secrets no vault.** Se encontrar credenciais reais, substituir por `<PLACEHOLDER>` **imediatamente** e reportar como CRÍTICO.
7. **Persistir sempre.** O relatório de auditoria E o Registry são salvos no vault.
8. **Fase 3 é obrigatória.** Sync Code↔Brain é o diferenciador. Pular esta fase transforma a auditoria em um link-checker genérico qualquer.
9. **Registry é sagrado.** Ler o Registry ANTES de iniciar qualquer fase. Nunca re-reportar um finding DEFERRED. Nunca re-descrever um finding PERSISTENT.
10. **Finding IDs são estáveis.** Um FND-XXXX atribuído a um finding nunca muda.

## Protocolo Anti-Alucinação (Zero Fabrication)

Este protocolo garante que a auditoria **nunca invente problemas**. Todo finding DEVE ter evidência verificável. Se você não pode apontar o arquivo exato, a linha exata, o link exato ou o campo exato que está errado, o finding não existe. Não o reporte.

---

## Modo de execução

- **Full audit (padrão):** Todas as 10 fases. Usar para auditorias mensais ou após sprints grandes.
- **Quick pulse:** Fases 1, 2, 4, 9 apenas. Saúde rápida em 5 minutos.
- **Deep sync:** Fases 3, 4, 5, 6 apenas. Focar no codebase↔brain.
- **Surgery only:** Fases 2, 8 apenas. Só reparos.

Especificar modo: `hm-brain-audit-gfinance full` | `hm-brain-audit-gfinance pulse` | `hm-brain-audit-gfinance sync` | `hm-brain-audit-gfinance surgery`

Default: `full`.

## Triggers

- `hm-brain-audit-gfinance` | `brain audit gfinance` | `auditar vault gfinance`
- `gfinance brain pulse` (→ modo quick pulse)
- `gfinance brain sync` (→ modo deep sync)
- `gfinance brain surgery` (→ modo surgery only)

## Caveman mode

Se `/caveman` estiver ativo, comprimir prosa entre tabelas. **Nunca comprimir:**
- Tabelas de findings
- Listas de ações de reparo
- O Brain Health Score
- Diffs de cirurgia
