const fs = require('fs');
const path = require('path');

// 1. Update E:\Obsidian\Synapse-Wiki\Arquitetura\G-Hub e G-Work.md
const obsidianWikiPath = "E:\\Obsidian\\Synapse-Wiki\\Arquitetura\\G-Hub e G-Work.md";
try {
  let content = fs.readFileSync(obsidianWikiPath, 'utf8');
  
  // Find where to insert the drag-and-drop documentation
  const targetText = `- **Limpeza de Mocks:** Todas as tarefas e dados mockados foram completamente removidos do banco de dados e sementes de migração. O banco inicia em estado limpo de mocks.`;
  const replacementText = `- **Limpeza de Mocks:** Todas as tarefas e dados mockados foram completamente removidos do banco de dados e sementes de migração. O banco inicia em estado limpo de mocks.
- **Kanban Drag-and-Drop Premium:** Implementada orquestração de movimentação fluida utilizando \`@dnd-kit/core\` com \`<DragOverlay>\`. O card original permanece na coluna como um marcador fantasma (\`opacity-25 border-dashed\`), enquanto o clone flutuante acompanha o cursor de forma estável com sombra projetada (\`shadow-2xl\`), escala (\`1.03\`) e rotação (\`-1deg\`) para feedback tátil premium. O arrastar foi expandido para o card completo, eliminando a dependência do grip handle minúsculo, mas mantendo a segurança de cliques curtos (ativação por distância >5px).`;

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

  const targetLog = `  - \`[PASS]\` Compilação: Next.js build e strict typecheck 100% verdes (zero erros).
  - \`[PASS]\` Análise de IA e Resiliência: Adicionada resiliência na análise de IA para arquivos grandes (Vercel timeout estendido para 300s via \`maxDuration\`). Corrigido fallback automático para múltiplos modelos do Gemini (\`gemini-2.5-flash-lite\` prioritário, evitando erros 503 e 429 de limites de cota da free tier).
  - \`[PASS]\` UX/UI: Implementada prevenção contra crashes ao receber erros HTML no parsing de JSON, e reset automático de mensagens de erro ao alternar gravações selecionadas.`;

  const newLog = `  - \`[PASS]\` Compilação: Next.js build e strict typecheck 100% verdes (zero erros).
  - \`[PASS]\` Análise de IA e Resiliência: Adicionada resiliência na análise de IA para arquivos grandes (Vercel timeout estendido para 300s via \`maxDuration\`). Corrigido fallback automático para múltiplos modelos do Gemini (\`gemini-2.5-flash-lite\` prioritário, evitando erros 503 e 429 de limites de cota da free tier).
  - \`[PASS]\` UX/UI: Implementada prevenção contra crashes ao receber erros HTML no parsing de JSON, e reset automático de mensagens de erro ao alternar gravações selecionadas.
  - \`[PASS]\` Kanban Drag-and-Drop: Reestruturada a funcionalidade de movimentação com o uso de \`@dnd-kit/core\` \`<DragOverlay>\` para evitar quebras de layout (layout shift) e lentidão. Expandimos o arrastar para a área inteira do card com z-index configurado, leve rotação (-1deg) e sombras durante o movimento, gerando uma experiência tátil, fluida e de altíssimo padrão visual.`;

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
