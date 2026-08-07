## 2026-06-11T16:26:18Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Multi-agent execution of separated CPO and CFO assistants

Separar o assistente conversacional Gemini em dois contextos isolados: um assistente CFO para o G-Finance (com acesso a saldos, transações e metas) e um assistente CPO (Chief Product Officer) para o G-Work (com acesso a tarefas, projetos e transcrições, e autonomia para manipulá-los via ferramenta).

Working directory: d:\APPS - ANTIGRAVITY\G-Hub
Integrity mode: development

## Requirements

### R1. Isolamento de Sessões e Memória no Banco
- Salvar e filtrar as sessões de chat com base na coluna `module` na tabela `chat_sessions` (valores: `'finance'` ou `'work'`).
- Separar o histórico e o provisionamento de novas sessões entre G-Finance (CFO Assistant) e G-Work (CPO Assistant).
- Adicionar suporte para salvar e compactar a memória perene individual de cada assistente no banco (`profiles.ai_memory` para finance, `profiles.ai_memory_work` para work).

### R2. CPO Assistant Core no G-Work
- Implementar o backend de IA do CPO Assistant em um novo arquivo com prompt de sistema específico (foco executivo, tom tático e estratégico, temporalidade) e injeção do Guilherme Context Profile (`contexto.md`).
- O CPO Assistant deve ter acesso exclusivo às tabelas de G-Work (`tasks`, `tasks_projects`, `transcriptions`, `ai_insights`) e **isolamento completo** dos dados financeiros de G-Finance.
- Dotar o CPO Assistant de ferramentas do banco de dados (database tools) para:
  - Listar, criar, atualizar e deletar tarefas.
  - Listar, criar, atualizar e deletar projetos.
  - Listar e deletar transcrições.
  - Listar e dispensar insights de IA.

### R3. UI do Chat com Diferenciação Visual e Funcional
- Modificar o FAB (`GeminiFab`) e o Chat Hub (`AiChatHub`) para detectar o módulo com base no pathname:
  - Rotas sob `/tasks` -> CPO Assistant com tema de cores **azul (Blue)**, sugestões de tarefas/projetos, e placeholders de produtividade.
  - Outras rotas -> CFO Assistant com tema de cores **verde (Emerald)**, sugestões financeiras, e placeholders de finanças.
- Passar o parâmetro `module` nas requirições da API de chat e sessões para garantir a consistência das chamadas.

## Acceptance Criteria

### Isolamento de Contexto
- [ ] O CPO Assistant (G-Work) não lista nem acessa as sessões de chat do CFO Assistant (G-Finance).
- [ ] O CPO Assistant não tem acesso e não lê tabelas de saldos, transações, compromissos ou metas financeiras.
- [ ] O CFO Assistant não lê tabelas de tarefas, projetos ou transcrições do G-Work.

### Autonomia e Funcionamento das Ferramentas
- [ ] Ao solicitar no chat do G-Work: "Crie uma tarefa chamada 'Ajustar layout' com prioridade alta", o CPO Assistant executa a ferramenta de criação de tarefa com sucesso no banco.
- [ ] Ao solicitar no chat do G-Work: "Quais são meus projetos?", o assistente lista os projetos cadastrados na tabela `tasks_projects`.
- [ ] Ao solicitar no chat do G-Work: "Marque a tarefa X como concluída", o assistente chama a ferramenta de atualização com sucesso.

### Interface e Design
- [ ] O chat aberto sob rotas de `/tasks` exibe o título "CPO Assistant" com elementos visuais (botão FAB, bordas, carregamento) nas cores azuis do G-Work.
- [ ] O chat aberto sob rotas financeiras exibe o título "CFO Assistant" com elementos visuais nas cores verdes do G-Finance.
