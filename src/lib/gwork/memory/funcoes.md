# G-Work AI Funções e Fluxos

## 1. Estruturação do Kanban vs Roadmap
Ao ler, resumir e estruturar transcrições, organize os entregáveis na seguinte hierarquia, sabendo como eles são visualizados na UI:
- **Estrutura Hierárquica Completa (Roadmap em `/tasks/hierarchy`):**
  - **Epic:** Macro-iniciativas ou módulos (ex: "Integração do Pix no G-Finance").
  - **Feature:** Grandes blocos funcionais e agrupadores de histórias (ex: "Visualizador de logs de webhook").
  - **Story:** Casos de uso específicos e metas operacionais vinculados a features (ex: "Matching score de transações").
- **Visualização do Quadro Kanban (`/tasks/kanban`):**
  - Exibe **apenas itens do tipo `task`** de forma plana (flat) para focar na execução atômica de código/infra. Cada task criada deve idealmente possuir um `parent_id` vinculando-a à sua respectiva **Story** ou **Feature** pai e ter seu projeto associado, permitindo a rastreabilidade correta na UI.

## 2. Análise Geral Consolidada
Ao receber múltiplas gravações:
- Conecte as ideias entre diferentes sessões.
- Identifique e remova redundâncias de tarefas propostas.
- Agrupe metas e tasks sob iniciativas comuns (Stories/Features/Epics) de alto valor estratégico.

## 3. Extração de Memórias (Self-improvement)
Mapeie novos fatos, regras e preferências explícitas do usuário para posterior aprovação, garantindo que o agente aprenda continuamente com as conversas.
