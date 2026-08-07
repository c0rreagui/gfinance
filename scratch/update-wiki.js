const fs = require('fs');
const path = require('path');

// 1. Update E:\Obsidian\Synapse-Wiki\Arquitetura\G-Hub e G-Work.md
const obsidianWikiPath = "E:\\Obsidian\\Synapse-Wiki\\Arquitetura\\G-Hub e G-Work.md";
try {
  let content = fs.readFileSync(obsidianWikiPath, 'utf8');
  
  // Update last updated date
  content = content.replace(/last_updated: \d{4}-\d{2}-\d{2}/, "last_updated: 2026-06-09");
  
  // Replace the tables section
  const targetTables = `### Tabelas G-Work

| Tabela | Função |
|--------|--------|
| \`public.tasks_projects\` | Projetos / clientes / canais |
| \`public.tasks\` | Kanban: \`status\` (\`todo\`/\`in_progress\`/\`completed\`), \`priority\` |
| \`public.transcriptions\` | Áudios do Google Drive integrados ao Gemini Parser |`;

  const newTables = `### Tabelas G-Work

| Tabela | Função | Campos Chave / Metadados |
|--------|--------|--------------------------|
| \`public.tasks_projects\` | Projetos / clientes / canais | \`name\`, \`description\`, \`color\` |
| \`public.tasks\` | Kanban hierárquico (Epic → Feature → Story → Task) | \`status\` (\`backlog\`/\`todo\`/\`in_progress\`/\`in_review\`/\`done\`/\`cancelled\`), \`priority\` (\`critical\`/\`high\`/\`medium\`/\`low\`/\`none\`), \`type\`, \`parent_id\`, \`sort_order\`, \`ai_generated\`, \`ai_confidence\`, \`source_transcription_id\`, \`due_date\` |
| \`public.transcriptions\` | Áudios do Google Drive integrados ao Gemini Parser | \`file_name\`, \`google_drive_file_id\`, \`content\`, \`ai_summary\`, \`ai_insights\` (texto legível), \`file_hash\`, \`extracted_entities\` (JSONB contendo a hierarquia), \`processed_at\`, \`gemini_model\`, \`token_count\` |
| \`public.ai_insights\` | Insights táticos estratégicos gerados por IA | \`insight_type\` (tipo), \`title\`, \`body\`, \`severity\` (\`info\`/\`warning\`/\`critical\`), \`related_work_items\`, \`related_transcriptions\` |`;

  content = content.replace(targetTables, newTables);

  // Replace Gemini AI Brain configuration section
  const targetGemini = `## 🤖 Gemini AI Brain — Arquitetura

### Configuração do Modelo
- **Modelo:** \`gemini-2.5-pro-preview-05-06\`
- **Persona:** CFO pessoal de Guilherme Corrêa
- **Temporal Awareness:** Data atual injetada no system prompt
- **Contexto de Dados:** Transações recentes + saldos atuais injetados via API Route

### Rotas de API
- \`POST /api/ai/chat\` — enviar mensagem, receber resposta Gemini
- \`GET /api/ai/sessions\` — listar sessões de chat do usuário
- \`POST /api/ai/sessions\` — criar nova sessão`;

  const newGemini = `## 🤖 Gemini AI Brain — Arquitetura

### Configuração do Modelo (G-Finance Chat)
- **Modelo:** \`gemini-2.5-pro-preview-05-06\`
- **Persona:** CFO pessoal de Guilherme Corrêa
- **Temporal Awareness:** Data atual injetada no system prompt
- **Contexto de Dados:** Transações recentes + saldos atuais injetados via API Route

### G-Work Task Curation Engine
- **Modelo Principal:** \`gemini-2.5-flash-lite\` (priorizado devido a alta velocidade, limites de cota mais flexíveis e excelente desempenho com estruturação JSON).
- **Lista de Fallback:** \`gemini-2.5-flash-lite\` → \`gemini-2.5-flash\` → \`gemini-2.0-flash-lite\` → \`gemini-2.0-flash\` → \`gemini-flash-latest\` → \`gemini-2.5-pro\`.
- **Estratégia de Resiliência de Timeout:** Rota \`/api/tasks/generate\` configurada com \`export const maxDuration = 300;\` para suportar transcrições extensas de mais de 100k caracteres (evitando timeout 504 de Serverless Functions na Vercel).
- **Tratamento de Erros no Frontend:** A página de transcrições valida o \`Content-Type\` antes de tentar parsear como JSON, prevenindo crashes ao receber páginas de erro HTML ou timeouts. O estado de erro é exibido contextualmente em um card inline que é limpo automaticamente ao trocar de arquivo.
- **Limpeza de Mocks:** Todas as tarefas e dados mockados foram completamente removidos do banco de dados e sementes de migração. O banco inicia em estado limpo de mocks.

### Rotas de API
- \`POST /api/ai/chat\` — enviar mensagem, receber resposta Gemini
- \`GET /api/ai/sessions\` — listar sessões de chat do usuário
- \`POST /api/ai/sessions\` — criar nova sessão
- \`POST /api/tasks/generate\` — auditar transcrição com IA e popular Kanban + insights`;

  content = content.replace(targetGemini, newGemini);
  
  fs.writeFileSync(obsidianWikiPath, content, 'utf8');
  console.log('Obsidian Wiki (G-Hub e G-Work.md) atualizada com sucesso!');
} catch (e) {
  console.error('Erro ao atualizar Obsidian Wiki:', e.message);
}

// 2. Update d:\APPS - ANTIGRAVITY\G-Hub\WIKI.md
const localWikiPath = path.join(__dirname, '..', 'WIKI.md');
try {
  let content = fs.readFileSync(localWikiPath, 'utf8');
  
  // Update last updated date at line 5
  content = content.replace(/Última atualização:\*\* \d{2} de [a-zA-Z]+ de \d{4}/, "Última atualização:** 09 de junho de 2026");

  // Update validation logs
  const targetLog = `### 🗓️ 09 de Junho de 2026 — /hm-DeEnQaUxVallPloy Pipeline
- **Veredicto:** BASELINE-READY
- **Findings G-Work:**
  - \`[PASS]\` G-Work: Painel Bento, Kanban Dnd, Árvore Hierárquica e Curation AI validados.
  - \`[PASS]\` Google Drive Sync: Permissão \`drive.readonly\` integrada, seletor de pastas e sync automático/manual ativo com integridade SHA-256.
  - \`[PASS]\` Compilação: Next.js build e strict typecheck 100% verdes (zero erros).
- **Status de Deploy:** Pushed to GitHub. Deploy ativo na Vercel.`;

  const newLog = `### 🗓️ 09 de Junho de 2026 — /hm-DeEnQaUxVallPloy Pipeline
- **Veredicto:** BASELINE-READY
- **Findings G-Work:**
  - \`[PASS]\` G-Work: Painel Bento, Kanban Dnd, Árvore Hierárquica e Curation AI validados.
  - \`[PASS]\` Google Drive Sync: Permissão \`drive.readonly\` integrada, seletor de pastas e sync automático/manual ativo com integridade SHA-256.
  - \`[PASS]\` Compilação: Next.js build e strict typecheck 100% verdes (zero erros).
  - \`[PASS]\` Análise de IA e Resiliência: Adicionada resiliência na análise de IA para arquivos grandes (Vercel timeout estendido para 300s via \`maxDuration\`). Corrigido fallback automático para múltiplos modelos do Gemini (\`gemini-2.5-flash-lite\` prioritário, evitando erros 503 e 429 de limites de cota da free tier).
  - \`[PASS]\` UX/UI: Implementada prevenção contra crashes ao receber erros HTML no parsing de JSON, e reset automático de mensagens de erro ao alternar gravações selecionadas.
- **Status de Deploy:** Pushed to GitHub. Deploy ativo na Vercel.`;

  content = content.replace(targetLog, newLog);
  
  fs.writeFileSync(localWikiPath, content, 'utf8');
  console.log('Local Wiki (WIKI.md) atualizada com sucesso!');
} catch (e) {
  console.error('Erro ao atualizar Local Wiki:', e.message);
}
