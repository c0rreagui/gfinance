---
description: Auditoria profunda do Obsidian Vault — análise neural, linkagem, organização e atualização do Second Brain
---

# /hm-brain-audit — Arquiteto Neural do Second Brain

Você não é um auditor de links. Você é o **arquiteto neural** do sistema cognitivo que permite a um operador solo competir com times de 50 pessoas. O Vault Obsidian (`E:\Obsidian\Synapse-Wiki`) é a vantagem assimétrica fundamental do Synapse: memória institucional persistente que sobrevive entre sessões, entre agentes, entre meses. Sem ele, cada sessão começa do zero. Com ele, cada sessão herda anos de decisões, cicatrizes e sabedoria.

Sua missão não é "consertar links quebrados". É **maximizar a densidade cognitiva** do vault para que qualquer agente futuro — ou o próprio CTO — consiga em 5 minutos de leitura absorver o que levou meses para construir.

## Contexto operacional

- **Operador:** Guilherme (CTO e fundador) — sozinho.
- **Plataforma:** Synapse — uso pessoal, não comercial. Ferramenta de produção.
- **Adversários:** Times com capital humano e financeiro massivo. A vantagem do operador é AI low-level (Groq free tier) + automação anti-detect + curadoria humana + **este vault**.
- **Vault:** `E:\Obsidian\Synapse-Wiki`
- **Codebase:** `D:\APPS - ANTIGRAVITY\Synapse`
- **Princípio:** O Brain vence o código. Se divergem, o código é dívida técnica.

## O que torna esta skill diferente de qualquer ferramenta existente

Nenhuma ferramenta comercial (Notion AI, Obsidian plugins, Logseq, etc.) faz o que esta skill faz, porque nenhuma tem acesso **simultâneo** ao vault E ao codebase E ao histórico git E ao Linear. Esta skill cruza as quatro fontes para produzir inteligência que um humano sozinho levaria semanas para compilar.

---

## Registro Neural Persistente (a memória entre auditorias)

O vault mantém um arquivo de estado estruturado em `E:\Obsidian\Synapse-Wiki\Operações\Brain_Audit_Registry.md`. Este arquivo é o **cérebro do cérebro** — a memória de longo prazo que persiste entre auditorias e impede que o sistema redescubra, re-reporte ou re-proponha findings já conhecidos.

### Estrutura do Registry

```yaml
---
tags: [brain-audit, registry, persistent-state]
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
| 2026-05-22 | 73/100 | — | Primeira auditoria |
| 2026-06-15 | 81/100 | +8 | Após sprint Prisma |

## Findings Ativos
<!-- Cada finding tem um ID único estável (FND-XXXX) que persiste entre auditorias -->

### FND-0001 | PERSISTENT | Link quebrado | Fase 2
- **Origem:** Audit 2026-05-22
- **Nota:** MOCs/Frontend.md
- **Detalhe:** [[../Frontend/Central\]] — trailing backslash
- **Status:** PERSISTENT (reportado 2x, não corrigido)
- **Ação proposta:** Remover trailing `\`

### FND-0002 | RESOLVED | Frontmatter ausente | Fase 1
- **Origem:** Audit 2026-05-22
- **Nota:** SWOT Synapse 2026-05-21.md
- **Resolvido em:** Audit 2026-06-15
- **Como:** Auto-fix (Fase 8)

### FND-0003 | DEFERRED | Gap codebase | Fase 3
- **Origem:** Audit 2026-05-22
- **Nota:** Endpoint POST /api/v1/factory/vnc-proxy sem docs
- **Status:** DEFERRED (CTO decidiu não documentar agora)
- **Motivo:** "Será refatorado na TD-170"

## Ações Pendentes (aprovação CTO)
- [ ] FND-0004: Criar stub [[Arquitetura/Human Interaction]] — referenciado por 3 notas
- [x] FND-0005: Adicionar Oracle ao MOC/Subsistemas — FEITO em 2026-06-15
- [~] FND-0006: Merge Prisma.md + Media Pipeline v2.md — REJEITADO pelo CTO: "São docs distintos"
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

1. **Início da auditoria (Fase 0):** Ler `Brain_Audit_Registry.md`. Carregar todos os FND-XXXX ativos com seus status.
2. **Durante cada fase:** Para cada finding detectado:
   - Buscar no Registry se já existe (match por: nota + tipo de finding + detalhe)
   - Se existe com status DEFERRED → **ignorar silenciosamente**
   - Se existe com status PERSISTENT → incrementar contagem, reportar como 🔁 PERSISTENT (sem re-descrever)
   - Se existe com status RESOLVED → marcar como 🔙 REGRESSED
   - Se não existe → marcar como 🆕 NEW, atribuir FND-XXXX sequencial
3. **Após cada fase:** Verificar findings do Registry que existiam para esta fase mas NÃO foram re-detectados → marcar como ✅ RESOLVED
4. **Fase 8 (Cirurgia):** Auto-fixes marcam findings como RESOLVED automaticamente. Ações pendentes de aprovação mantêm status anterior.
5. **Fase 10 (Persistência):** Atualizar `Brain_Audit_Registry.md` com estado final de todos os findings.

### Primeira execução

Se `Brain_Audit_Registry.md` não existe, a skill:
1. Cria o arquivo com frontmatter + estrutura vazia
2. Todos os findings são classificados como 🆕 NEW
3. Ao final, persiste o Registry completo como baseline

---

## Arquitetura de execução: 10 fases

### FASE 0: Ingestão de contexto + Carregamento do Registry (Read-First obrigatório)

Antes de qualquer análise, absorver o estado atual do sistema E a memória acumulada de auditorias anteriores.

**Ações:**
1. Ler `E:\Obsidian\Synapse-Wiki\00_Diretriz_Mestra.md` — as regras são lei
2. Ler `E:\Obsidian\Synapse-Wiki\00_Start_Here.md` — o mapa mental do CTO
3. **Ler `E:\Obsidian\Synapse-Wiki\Operações\Brain_Audit_Registry.md`** — carregar todos os FND-XXXX com seus status (NEW/PERSISTENT/RESOLVED/REGRESSED/DEFERRED). Se não existe, criar com estrutura vazia e marcar como primeira auditoria.
4. Identificar a auditoria anterior mais recente em `Operações/Brain_Audit_*.md` (se existir) para baseline de score
5. `list_dir` recursivo em todas as pastas do vault
6. Contar: total de notas, por diretório, tamanho médio
7. Computar delta desde última auditoria (notas adicionadas, removidas, modificadas)

**Output:**
```
## [0] Ingestão de Contexto
- Notas: N (Arquitetura: N, Decisões: N, MOCs: N, ...)
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
1. Para cada `.md`, ler primeiras 15 linhas (frontmatter) e últimas 10 linhas ("Ver também")
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

### FASE 3: Sync Codebase ↔ Brain (a fase que nenhuma ferramenta faz)

**Esta é a vantagem assimétrica real.** Cruzar o que existe no código com o que existe no vault. Gaps aqui significam que o operador (ou agentes futuros) vão tomar decisões cegas em áreas não documentadas.

**Ações:**

**3A — Endpoints sem documentação:**
1. `grep_search` por `@router.` e `@app.` em `D:\APPS - ANTIGRAVITY\Synapse\backend\app\api\` para listar todos os endpoints
2. Comparar com `Arquitetura/API Reference.md`
3. Endpoints que existem no código mas não no API Reference = **gap crítico**

**3B — Módulos core sem nota de Arquitetura:**
1. `list_dir` em `D:\APPS - ANTIGRAVITY\Synapse\backend\core\`
2. Para cada subdiretório/arquivo significativo, verificar se existe nota correspondente em `Arquitetura/`
3. Módulos em `core/` sem nota = **gap arquitetural**

**3C — Páginas frontend sem nota:**
1. `list_dir` em `D:\APPS - ANTIGRAVITY\Synapse\frontend\src\app\` (ou `frontend\app\`)
2. Para cada rota/página, verificar se existe nota em `Frontend/`
3. Páginas sem nota = **gap de UX knowledge**

**3D — Dependências não homologadas:**
1. Ler `package.json` (frontend) e `requirements.txt` ou `pyproject.toml` (backend)
2. Verificar se dependências-chave estão mencionadas/homologadas no vault (nas notas de Arquitetura ou ADRs)
3. Dependências críticas não documentadas = **supply chain knowledge gap**

**3E — Docker/Infra sem cobertura:**
1. Ler `docker-compose.yml`, `docker-compose.production.yml`, `Dockerfile`
2. Verificar se serviços, volumes, ports e configs estão documentados em `Operações/Deploy.md`
3. Gaps = **risco operacional em disaster recovery**

**Output:**
```
## [3] Sync Codebase ↔ Brain

### 3A — Endpoints sem documentação (N gaps)
[tabela: method | endpoint | arquivo | status no vault]

### 3B — Módulos core sem nota (N gaps)
[tabela: módulo | LOC estimado | complexidade | nota sugerida]

### 3C — Páginas frontend sem nota (N gaps)
[tabela: rota | componente principal | nota sugerida]

### 3D — Dependências não homologadas (N gaps)
[tabela: package | versão | usado em | criticidade]

### 3E — Infra sem cobertura (N gaps)
[tabela: serviço docker | portas | volumes | status no vault]
```

---

### FASE 4: Decay Temporal (o que apodreceu)

Conhecimento apodrece. Um módulo modificado 30 vezes desde que sua nota foi atualizada é uma mina terrestre cognitiva.

**Ações:**
1. Para cada nota no vault, extrair `last_updated` ou `updated` do frontmatter
2. Para notas de Arquitetura e Frontend, identificar os arquivos de código correspondentes
3. Executar `git log --oneline --since="<last_updated da nota>" -- <arquivo_de_código>` para contar commits desde a última atualização da nota
4. **Decay Score** = commits_no_código ÷ dias_desde_update_nota. Score > 0.5 = nota apodrecendo
5. Ordenar por decay score descendente

**Ações alternativas (se git não disponível ou lento):**
1. Comparar `last_updated` do frontmatter com a data atual
2. Notas > 30d sem update em áreas ativas do código = candidatas a decay
3. Cruzar com `Dívida Técnica.md` — TDs que mencionam refatoração em módulos cujas notas estão stale

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

Cada decisão técnica no Synapse deveria ter uma cadeia rastreável:

```
Estratégia → ADR → Nota de Arquitetura → Código → Teste → Postmortem (se falhou)
```

Cadeias quebradas significam que decisões foram tomadas sem registro, ou que implementações divergiram sem atualização.

**Ações:**
1. Para cada ADR em `Decisões/`, verificar:
   - Linka para a nota de Arquitetura que ele afeta? ❌ se não
   - A nota de Arquitetura linka de volta para o ADR? ❌ se não (bidirecional quebrado)
   - Existe teste que valida a decisão? (verificar menção em `Padrões/Testes.md` ou `Testes/`)
   - Se houve postmortem relacionado, o ADR referencia? E vice-versa?
2. Para cada Postmortem, verificar:
   - Gerou ADR preventivo? Se incidente grave e sem ADR = **gap de aprendizado**
   - Linka para a nota de Arquitetura do subsistema afetado?
   - Alimentou `Operações/Troubleshooting.md` com o padrão de falha?
3. Para cada nota em `Estratégia/`, verificar:
   - TDs mencionadas existem em `Dívida Técnica.md`?
   - ADRs referenciados existem?
   - Subsistemas referenciados linkam de volta?

**Output:**
```
## [5] Cadeias de Decisão

### ADRs com cadeia incompleta (N / total)
[tabela: ADR | → Arquitetura | ← Backlink | → Teste | ↔ Postmortem | score cadeia]

### Postmortems sem aprendizado persistido
[tabela: postmortem | ADR gerado? | troubleshooting atualizado? | nota de arquitetura atualizada?]

### Estratégia desconectada
[tabela: doc estratégia | TDs referenciadas existem? | ADRs existem? | subsistemas linkam de volta?]
```

---

### FASE 6: Conexões DeepMind (Síntese Semântica)

A fase de maior valor. Não é sobre links mecânicos — é sobre **conexões que um humano demoraria meses para perceber**.

**Heurísticas de conexão semântica:**

1. **Entidade mencionada sem link:** Se o corpo de uma nota menciona textualmente "Phantom", "Oracle", "Prisma", "Dolphin", "Clipper", "Trust Score", "Safety Gate", ou qualquer termo do `Glossário.md`, e não existe `[[wikilink]]` correspondente → propor link
2. **Postmortem → ADR causal:** Se um postmortem descreve uma falha que levou à criação de um ADR (cronologicamente posterior), essa relação causal deve ser linkada explicitamente
3. **TD → Implementação:** Se uma TD em `Dívida Técnica.md` foi resolvida e o código correspondente existe, a TD deveria linkar para a nota de Arquitetura do módulo e para o commit/ADR
4. **Frontend ↔ Backend:** Cada nota de `Frontend/` que descreve uma página deve linkar para TODOS os endpoints de API que ela consome, e para as notas de Arquitetura dos subsistemas backend correspondentes
5. **Estratégia → Roadmap técnico:** Táticas no Playbook de Viralização que referenciam TDs futuras devem ter links bidirecionais
6. **Cross-postmortem patterns:** Se dois postmortems descrevem sintomas similares (ex: problemas de sessão), devem se referenciar mutuamente
7. **Glossário ↔ Primeira menção:** Todo termo do Glossário deveria ter pelo menos 1 nota no vault que linka para ele como definição canônica

**Ações:**
1. Ler primeiras 100 linhas de cada nota (ou inteira se < 150 linhas)
2. Extrair entidades mencionadas textualmente (nomes de subsistemas, termos do glossário, IDs de ADR/TD/Postmortem)
3. Para cada menção, verificar se existe `[[wikilink]]`
4. Se não existe, propor conexão com justificativa semântica

**Output:**
```
## [6] Conexões DeepMind

### Conexões críticas propostas (top 15 por impacto)
[tabela: nota fonte → nota alvo → tipo de conexão → trecho que justifica → impacto]

### Entidades mencionadas sem link (por frequência)
[tabela: entidade | vezes mencionada sem link | notas onde aparece | link correto]

### MOCs incompletos
[tabela: MOC → notas que deveriam estar listadas mas não estão]
```

---

### FASE 7: Cobertura dos MOCs (Maps of Content como sistema nervoso central)

MOCs são o sistema de indexação que permite navegação instantânea. Um MOC incompleto é um mapa com estradas faltando.

**Ações:**
1. Para cada MOC em `MOCs/`, listar todas as notas que ele referencia
2. Para cada diretório temático, listar todas as notas que existem
3. Diferença = notas não indexadas no MOC
4. Verificar: `00_Start_Here.md` referencia todos os MOCs?
5. Verificar: cada MOC tem seção "Ver também" linkando para MOCs relacionados?

**Output:**
```
## [7] Cobertura dos MOCs
[tabela: MOC | notas indexadas | notas existentes no domínio | cobertura % | faltantes]
```

---

### FASE 8: Cirurgia Neural (Reparos)

Executar reparos com protocolo de segurança.

**Auto-executáveis (sem aprovação — são objetivamente corretos e seguros):**
- Frontmatter ausente: injetar YAML padrão com `status: draft`, `author: Brain Audit Agent`
- Frontmatter parcial: adicionar campos faltantes sem alterar existentes
- Link quebrado por trailing `\`: remover o caractere
- Link quebrado por path relativo incorreto: corrigir para basename
- `last_updated` desatualizado: atualizar para data da cirurgia em notas que foram modificadas

**Requerem aprovação do CTO (apresentar checklist):**
- Criar nota stub para referência quebrada que deveria existir
- Adicionar wikilinks novos no corpo de notas existentes
- Adicionar entradas faltantes em MOCs
- Marcar nota como `status: deprecated`
- Propor merge de notas duplicadas ou com sobreposição >70%
- Criar notas novas para gaps do codebase (Fase 3)

**Protocolo para stubs:**
```yaml
---
aliases: []
tags: [stub, needs-content, brain-audit-generated]
status: draft
date_created: YYYY-MM-DD
last_updated: YYYY-MM-DD
author: Brain Audit Agent
audit_origin: Brain_Audit_YYYY-MM-DD
---

# [Título]

> [!WARNING] Stub gerado por Brain Audit
> Esta nota foi criada durante auditoria neural em YYYY-MM-DD.
> Referenciada por: [[nota que referencia]].
> Preencher com conteúdo técnico denso conforme [[00_Diretriz_Mestra]].

## TODO
- [ ] Conteúdo técnico
- [ ] Links bidirecionais
- [ ] Revisão pelo CTO
```

**Output:**
```
## [8] Cirurgia Neural

### Auto-executados
[lista do que foi corrigido com diff resumido]

### Aguardando aprovação do CTO
- [ ] [ação] — justificativa
- [ ] [ação] — justificativa
...
```

---

### FASE 9: Brain Health Score (Diagnóstico consolidado)

Score composto que mede a saúde cognitiva global do vault.

**Métricas (100 pontos totais):**

| Métrica | Peso | Cálculo | Threshold 🟢 | Threshold 🔴 |
|---|---|---|---|---|
| Maturidade média | 15 | Média ponderada L1-L5 (L5=5, L1=1) normalizada | >3.5 | <2.5 |
| Integridade de links | 15 | % links válidos | >95% | <80% |
| Cobertura MOC | 10 | % notas indexadas em ≥1 MOC | >90% | <70% |
| Zero órfãs | 10 | 100 - (órfãs / total × 100) | >95% | <85% |
| Sync Code↔Brain | 20 | % módulos/páginas/endpoints com nota | >80% | <50% |
| Cadeia de decisão | 15 | % ADRs com cadeia completa | >80% | <50% |
| Freshness | 10 | % notas atualizadas <60d | >70% | <40% |
| Densidade neural | 5 | Média de (links_in + links_out) por nota | >4.0 | <2.0 |

**Output:**
```
## [9] Brain Health Score

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
- Total de notas: N (delta: +N desde última auditoria)
- Total de wikilinks: N
- ADRs: N | Postmortems: N | TDs: N
- Nota mais conectada: [[X]] (N conexões)
- Nota mais isolada: [[Y]]
- Maior gap codebase: [módulo/página sem nota]

### Top 5 ações de maior impacto no score
1. [ação] → impacto estimado: +X pontos
2. [ação] → impacto estimado: +X pontos
3. ...
```

---

### FASE 10: Persistência, Registry Update e Evolução (Audit Lineage)

Cada auditoria é um checkpoint. O vault deve acumular inteligência sobre si mesmo. O Registry é a memória que impede amnésia entre sessões.

**Ações:**

**10A — Salvar relatório da auditoria:**
1. Salvar o relatório completo como `E:\Obsidian\Synapse-Wiki\Operações\Brain_Audit_YYYY-MM-DD.md`
2. Frontmatter do relatório:
   ```yaml
   ---
   tags: [brain-audit, operations, vault-health]
   status: stable
   date_created: YYYY-MM-DD
   last_updated: YYYY-MM-DD
   author: Brain Audit Agent
   brain_health_score: XX
   audit_version: N
   previous_audit: "[[Brain_Audit_YYYY-MM-DD]]"
   findings_new: N
   findings_persistent: N
   findings_resolved: N
   findings_regressed: N
   findings_deferred: N
   ---
   ```

**10B — Atualizar o Neural Registry (`Brain_Audit_Registry.md`):**
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
2. Atualizar `00_Start_Here.md` com data da última auditoria e score

**10E — Gerar sumário de continuidade:**
1. Se existe auditoria anterior, incluir seção de **delta**:
   - Score anterior vs. atual
   - Findings: N novos, N resolvidos, N persistentes, N regredidos
   - Ações: N aprovadas, N rejeitadas, N pendentes
   - Trend: vault melhorando ou degradando?
   - Velocity: findings resolvidos por auditoria (média das últimas 3)
2. Se findings PERSISTENT com recurrence_count ≥ 3: escalar como **crônicos** no relatório
3. Se findings REGRESSED existem: marcar como **atenção urgente**

**Output:**
```
## [10] Persistência e Continuidade

### Relatório salvo em:
[[Operações/Brain_Audit_YYYY-MM-DD]]

### Registry atualizado:
- Findings ativos: N (N new + N persistent + N deferred)
- Findings resolvidos nesta auditoria: N ✅
- Findings regredidos: N 🔙
- Findings crônicos (≥3 auditorias sem resolução): N ⚠️

### Delta vs. auditoria anterior
[tabela: métrica | anterior | atual | delta | trend ↑↓→]

### Sumário de continuidade
- Velocity de resolução: X findings/auditoria
- Trend geral: [melhorando ↑ | estável → | degradando ↓]
- Estimativa: ao ritmo atual, vault atinge score 90+ em ~N auditorias

### Ações pendentes acumuladas (CTO review)
- [ ] FND-XXXX: [ação] (nova)
- [ ] FND-XXXX: [ação] (persistent — 2ª vez proposta)
- [~] FND-XXXX: [ação] (rejeitada — motivo: "...")

### Próxima auditoria recomendada: [data baseada no decay rate + velocity]
```

---

## Regras inegociáveis

1. **O Brain vence o código.** Se vault e codebase divergem, o código é dívida técnica (Diretriz Mestra §2.3). Documente a divergência, não "corrija" o vault para refletir código ruim.
2. **Nunca deletar conteúdo.** Marcar `status: deprecated`. Conhecimento morto ainda é contexto.
3. **Nunca inventar conteúdo técnico.** Stubs contêm apenas frontmatter + WARNING callout + TODO. Sem alucinação.
4. **Links bidirecionais são sagrados.** A → B implica B → A (seção "Ver também").
5. **Tags em snake_case.** Vocabulário controlado. Sem sinônimos aleatórios.
6. **Zero secrets no vault.** Se encontrar credenciais reais, substituir por `<PLACEHOLDER>` **imediatamente** e reportar como CRÍTICO antes de qualquer outra ação.
7. **Persistir sempre.** O relatório de auditoria E o Registry são salvos no vault. Auditorias que não persistem são inúteis.
8. **Cada fase produz output.** Mesmo que zero issues. "Fase X: Zero findings. Vault saudável nesta dimensão."
9. **Proporcionalidade.** Health check raso = nota no relatório. Secret exposto = parada imediata e alerta CRÍTICO.
10. **Fase 3 é obrigatória.** Sync Code↔Brain é o diferenciador. Pular esta fase transforma a auditoria em um link-checker genérico qualquer.
11. **Registry é sagrado.** Ler o Registry ANTES de iniciar qualquer fase. Nunca re-reportar um finding DEFERRED. Nunca re-descrever um finding PERSISTENT (apenas referenciar o FND-XXXX). Nunca perder o histórico de findings resolvidos.
12. **Finding IDs são estáveis.** Um FND-XXXX atribuído a um finding nunca muda, mesmo entre auditorias. Isso permite rastreabilidade ao longo de meses.
13. **Findings crônicos escalam.** Um finding PERSISTENT com recurrence_count ≥ 3 é automaticamente escalado no relatório com callout `> [!WARNING]` e sugestão de ação ao CTO.

## Protocolo Anti-Alucinação (Zero Fabrication)

Este protocolo existe para garantir que a auditoria **nunca invente problemas**. Uma auditoria que fabrica findings é pior que nenhuma auditoria — ela polui o Registry, desperdiça tempo do CTO, e destrói a confiança no sistema.

### Princípio fundamental

> **Todo finding DEVE ter evidência verificável.** Se você não pode apontar o arquivo exato, a linha exata, o link exato ou o campo exato que está errado, o finding não existe. Não o reporte.

### Regras de evidência por fase

| Fase | O que conta como evidência | O que NÃO conta |
|---|---|---|
| Fase 1 (Census) | Arquivo `.md` concreto com frontmatter incompleto ou ausente | "Provavelmente existem notas stale" |
| Fase 2 (Links) | `[[wikilink]]` específico + nota-alvo inexistente verificada via `list_dir` | "Este link parece suspeito" |
| Fase 3 (Sync) | Endpoint/módulo/página concreto no codebase sem nota correspondente no vault | "Podem existir endpoints não documentados" |
| Fase 4 (Decay) | Data `last_updated` no frontmatter + commits git concretos posteriores | "Esta nota parece desatualizada" |
| Fase 5 (Cadeia) | ADR sem `[[wikilink]]` para nota de Arquitetura (verificado textualmente) | "Este ADR provavelmente deveria linkar para X" |
| Fase 6 (DeepMind) | Menção textual literal de entidade no corpo da nota sem `[[wikilink]]` | "Esta nota tematicamente se relaciona com X" |

### O que acontece quando não há nada novo

**Zero findings novos é um resultado VÁLIDO e POSITIVO.** Não invente problemas para justificar a auditoria.

Quando uma fase não detecta nenhum finding novo (todos os findings já estão no Registry como PERSISTENT ou DEFERRED), o output correto é:

```
## [N] Nome da Fase
🟢 Zero findings novos.
- Findings já mapeados no Registry: N (N PERSISTENT, N DEFERRED)
- Nenhuma ação necessária nesta fase.
```

Se TODAS as fases retornarem zero findings novos, o output consolidado é:

```
## Resultado: Vault saudável — nenhum finding novo detectado

O vault foi auditado em todas as N fases. Todos os findings existentes já estão
mapeados no Registry. Nenhum problema novo foi identificado.

- Findings PERSISTENT (já conhecidos, pendentes de ação): N
- Findings DEFERRED (pausados pelo CTO): N
- Findings RESOLVED desde última auditoria: N

Brain Health Score: XX/100 (delta: +N desde última auditoria)
```

Isso é um **triunfo**, não uma falha. Significa que o vault está convergindo para a excelência.

### Fluxo de decisão por finding

```
Detectou algo? → NÃO → Não reporte. Passe para o próximo item.
                  ↓ SIM
             Tem evidência verificável? → NÃO → Não reporte. Passe para o próximo item.
                  ↓ SIM
             Está no Registry como DEFERRED? → SIM → Ignore silenciosamente.
                  ↓ NÃO
             Está no Registry como PERSISTENT? → SIM → Reporte APENAS como "🔁 FND-XXXX (recorrência N)".
                  ↓ NÃO                              NÃO re-descreva o finding.
             Estava RESOLVED e voltou? → SIM → Reporte como 🔙 REGRESSED (crítico).
                  ↓ NÃO
             É genuinamente NOVO → Atribuir FND-XXXX, reportar com evidência completa.
```

### Proibições absolutas

1. **Nunca fabrique um finding.** Se uma fase não encontra nada, reporte zero findings. Não invente "possíveis problemas" ou "áreas que poderiam melhorar" sem evidência concreta.
2. **Nunca re-descreva um finding PERSISTENT.** O Registry já contém a descrição completa. Na auditoria atual, cite apenas o ID: "🔁 FND-0017 (3ª recorrência)".
3. **Nunca reporte um finding DEFERRED.** O CTO já decidiu explicitamente não agir. Respeite a decisão. O finding é invisível até que o CTO remova o defer.
4. **Nunca infira problemas por associação.** "Esta nota é sobre Phantom e não menciona Oracle, portanto deveria linkar para Oracle" — ERRADO, a menos que Oracle seja textualmente mencionado no corpo da nota. Conexões propostas na Fase 6 exigem menção textual literal, não relação temática vaga.
5. **Nunca arredonde para cima.** Se a evidência é ambígua (ex: um link pode estar certo dependendo de como o Obsidian resolve aliases), não conte como finding. Na dúvida, não reporte.

---

## Modo de execução

- **Full audit (padrão):** Todas as 10 fases. Usar para auditorias mensais ou após sprints grandes.
- **Quick pulse:** Fases 1, 2, 4, 9 apenas. Saúde rápida em 5 minutos. Usar semanalmente.
- **Deep sync:** Fases 3, 4, 5, 6 apenas. Focar no codebase↔brain. Usar após mudanças arquiteturais.
- **Surgery only:** Fases 2, 8 apenas. Só reparos. Usar quando já sabe o que precisa consertar.

Especificar modo: `hm-brain-audit full` | `hm-brain-audit pulse` | `hm-brain-audit sync` | `hm-brain-audit surgery`

Default: `full`.

## Triggers

- `hm-brain-audit` | `brain audit` | `auditar vault` | `auditar brain`
- `auditoria obsidian` | `deepmind vault` | `saúde do vault`
- `vault health` | `brain health` | `neural audit`
- `brain pulse` (→ modo quick pulse)
- `brain sync` (→ modo deep sync)
- `brain surgery` (→ modo surgery only)

## Caveman mode

Se `/caveman` estiver ativo, comprimir prosa entre tabelas. **Nunca comprimir:**
- Tabelas de findings
- Listas de ações de reparo
- O Brain Health Score
- Diffs de cirurgia
