---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Kanban Board Drag & Drop and Task Separation"
date_created: 2026-06-11
primary_axis: "Cognitive Clarity"
secondary_axis: "Developer Experience (DX)"
blockers_found: 2
phantom_paths_detected: 0
---

# Flow Trace: Kanban Board Drag & Drop and Task Separation

## 📊 Visão Geral do Fluxo
- **Páginas Afetadas:** [/tasks/kanban](file:///d:/APPS%20-%20ANTIGRAVITY/G-Hub/src/app/tasks/kanban/page.tsx)
- **Persona Analisada:** Steady-State User (organizando tarefas diárias do produto G-Work)
- **Eixo Primário:** Cognitive Clarity | **Eixo Secundário:** Developer Experience (DX)

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | Steady-State | Usuário clica no card da tarefa para abrir os detalhes e alterar o status. | Abre o modal de detalhes e altera o status com sucesso, porém o card permanece visível na coluna inicial ("A Fazer"). | `!=` | Verified | **[BLOCKER]** O usuário sente que as alterações não surtem efeito e que a plataforma está com falha de persistência. |
| **2** | Steady-State | Usuário arrasta uma subtask da coluna "A Fazer" para a coluna "Em Progresso". | O card é arrastado, mas após soltá-lo ele continua aparecendo na coluna inicial sob a Story, e às vezes aparece duplicado/solto na nova coluna. | `!=` | Verified | **[BLOCKER]** Fricção severa e confusão visual devido à duplicação de cards e falta de feedback de movimento. |
| **3** | Steady-State | Usuário usa o Kanban para gerenciar apenas tarefas acionáveis imediatas, de forma limpa. | O Kanban mistura stories e tasks em um layout aninhado complexo que dificulta a visualização de gargalos e sobrecarrega a interface. | `~` | Verified | Sobrecarga cognitiva com 57 cards dispostos de forma desorganizada. |

---

## 🔬 Detalhamento de Estados por Step

### Step 1: Alteração de Status no Modal de Detalhes
- **Input:** Usuário clica no card da task, altera o select de "Estado" de `todo` para `in_progress` e clica em "Salvar".
- **System:** `setWorkItems` é disparado atualizando o status do item na lista local. A requisição HTTP PUT/PATCH é enviada via Supabase Client.
- **Output:** Modal de detalhes fecha. O card de task continua aparecendo na coluna "A Fazer" sob o cabeçalho da Story correspondente.
- **Side Effects:** Escrita no banco Supabase (`tasks.status = 'in_progress'`) concluída com sucesso.
- **Backstage:** Nenhuma tarefa assíncrona profunda pendente.

### Step 2: Arrastar e Soltar (Drag & Drop)
- **Input:** Usuário arrasta o card de task de "A Fazer" e solta na coluna "Em Progresso".
- **System:** `handleDragEnd` é disparado, alterando localmente o status da task para a coluna de destino.
- **Output:** O card retorna visualmente para a coluna "A Fazer" sob a Story correspondente. Um card órfão "clone" pode aparecer na coluna "Em Progresso".
- **Side Effects:** Update efetuado na tabela `tasks` do Supabase via client API.
- **Backstage:** Nenhuma tarefa em background pendente.

---

## 🧐 Causa Raiz do Bug
1. **Falta de Filtro de Status nas Subtasks da Story:**
   Na página [/tasks/kanban/page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Hub/src/app/tasks/kanban/page.tsx), a função `buildColumnData` agrupa as tasks sob as stories na coluna da story:
   ```typescript
   const stories = colItems
     .filter(item => item.type === 'story')
     .map(story => ({
       ...story,
       childTasks: filteredItems.filter(t => t.type === 'task' && t.parent_id === story.id)
     }));
   ```
   Como `filteredItems` não é filtrada pelo status da task na busca das `childTasks`, todas as tasks filhas daquela story são exibidas na coluna da story, independentemente do status da própria task. Por isso, a task alterada para "Em Progresso" permanece na coluna "A Fazer" se a story pai estiver em "A Fazer".
2. **Duplicação de Cards:**
   A mesma task com status "Em Progresso" é inserida na coluna "Em Progresso" como uma `orphanTask` (porque a story pai não está na coluna "Em Progresso"), criando a duplicação visual.

---

## ⚡ Recomendações e Plano de Correção

| Categoria | Gargalo / Fricção Identificada | Solução Proposta | Custo (S/M/L) |
| :--- | :--- | :--- | :--- |
| **Arquitetura** | Aninhamento rígido e bugado de subtasks no Kanban | Remover agrupamento complexo de Story/Tasks no Kanban. Exibir apenas **Tasks** no quadro Kanban de forma plana e limpa. Stories, Features e Epics pertencem estritamente à visão de Roadmap (`/tasks/hierarchy`). | **M** |
| **UI/UX** | Exibição de meta-informação de contexto | No card de cada Task no Kanban, renderizar de forma elegante o nome do projeto e o título da **Story** ou **Feature** pai à qual ela pertence (como badges informativas), mantendo a rastreabilidade sem quebrar o layout. | **S** |
| **Dnd-kit** | Arrastar card com clique total | Ajustar o `dragHandleProps` no `WorkItemCard` e `DraggableCard` para que o arrasto seja acionado apenas pelo ícone de grip vertical ou tratar conflito com clique. | **S** |

---

## 🏓 Handoff de Especialistas
- **Para /hm-designer:** Validar o layout premium dos cards planos com badges de Story pai e projeto no Kanban.
- **Para /hm-qa:** Validar se a movimentação de cards de tarefas entre colunas persiste instantaneamente no banco de dados e atualiza o estado local sem flicker ou duplicação.
- **Para /hm-engineer:** Verificar a integridade dos tipos e consultas ao remover `stories` da página do Kanban.
