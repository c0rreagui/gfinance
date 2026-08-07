const fs = require('fs');
const path = require('path');

// 1. Update E:\Obsidian\Synapse-Wiki\Arquitetura\G-Hub e G-Work.md
const obsidianWikiPath = "E:\\Obsidian\\Synapse-Wiki\\Arquitetura\\G-Hub e G-Work.md";
try {
  let content = fs.readFileSync(obsidianWikiPath, 'utf8');
  
  const targetText = `- **Limpeza de Mocks:** Todas as tarefas e dados mockados foram completamente removidos do banco de dados e sementes de migração. O banco inicia em estado limpo de mocks.`;
  const replacementText = `- **Limpeza de Mocks:** Todas as tarefas e dados mockados foram completamente removidos do banco de dados e sementes de migração. O banco inicia em estado limpo de mocks.
- **Ações em Massa em Transcrições:** Adicionado suporte para seleção em massa das gravações. Permite associar múltiplos arquivos a um projeto de uma só vez, disparar análise de IA sequencial (com delay de 800ms de segurança) para as gravações pendentes selecionadas e deletar registros múltiplos do banco de dados, integrado com um painel de ações flutuante de design premium.`;

  if (content.includes(targetText)) {
    content = content.replace(targetText, replacementText);
    fs.writeFileSync(obsidianWikiPath, content, 'utf8');
    console.log('Obsidian Wiki (G-Hub e G-Work.md) atualizada com sucesso!');
  } else {
    console.warn('Alvo de substituição não encontrado em G-Hub e G-Work.md');
  }
} catch (e) {
  console.error('Erro ao atualizar Obsidian Wiki:', e.message);
}

// 2. Update d:\APPS - ANTIGRAVITY\G-Hub\WIKI.md
const localWikiPath = path.join(__dirname, '..', 'WIKI.md');
try {
  let content = fs.readFileSync(localWikiPath, 'utf8');

  const targetLog = `  - \`[PASS]\` UX/UI: Implementada prevenção contra crashes ao receber erros HTML no parsing de JSON, e reset automático de mensagens de erro ao alternar gravações selecionadas.
  - \`[PASS]\` Kanban Drag-and-Drop: Reestruturada a funcionalidade de movimentação com o uso de \`@dnd-kit/core\` \`<DragOverlay>\` para evitar quebras de layout (layout shift) e lentidão. Expandimos o arrastar para a área inteira do card com z-index configurado, leve rotação (-1deg) e sombras durante o movimento, gerando uma experiência tátil, fluida e de altíssimo padrão visual.`;

  const newLog = `  - \`[PASS]\` UX/UI: Implementada prevenção contra crashes ao receber erros HTML no parsing de JSON, e reset automático de mensagens de erro ao alternar gravações selecionadas.
  - \`[PASS]\` Kanban Drag-and-Drop: Reestruturada a funcionalidade de movimentação com o uso de \`@dnd-kit/core\` \`<DragOverlay>\` para evitar quebras de layout (layout shift) e lentidão. Expandimos o arrastar para a área inteira do card com z-index configurado, leve rotação (-1deg) e sombras durante o movimento, gerando uma experiência tátil, fluida e de altíssimo padrão visual.
  - \`[PASS]\` Ações em Massa (Transcrições): Implementado modo de seleção em massa na aba de gravações, permitindo exclusão em lote, alteração de projeto em lote e processamento sequencial de IA com espaçamento temporal (800ms) para respeitar cotas de requisições da API do Gemini. Exibido via barra de controle flutuante glassmorphic no rodapé.`;

  if (content.includes(targetLog)) {
    content = content.replace(targetLog, newLog);
    fs.writeFileSync(localWikiPath, content, 'utf8');
    console.log('Local Wiki (WIKI.md) atualizada com sucesso!');
  } else {
    console.warn('Alvo de substituição não encontrado em WIKI.md');
  }
} catch (e) {
  console.error('Erro ao atualizar Local Wiki:', e.message);
}
