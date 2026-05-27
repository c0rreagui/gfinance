---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Cripto Portfolio"
date_created: 2026-05-27
primary_axis: "Cognitive Clarity"
secondary_axis: "Conversion"
blockers_found: 1
phantom_paths_detected: 0
---

# Flow Trace: Portfolio Cripto (/crypto)

## 📊 Visão Geral do Fluxo
O painel **Portfolio Cripto** é uma página client-side estruturada de forma estática no Next.js App Router, projetada para servir como o centro de monitoramento e visualização de ativos baseados em blockchain no ecossistema G-Finance. O design atual aposta em uma estética premium de alta fidelidade visual, com sparklines SVG gerados de forma determinística, servindo como uma vitrine de intenção funcional (*mock state*) para preparar o ecossistema para a futura integração de carteiras Web3 e sincronização de exchanges centralizadas (CeFi).

- **Páginas Afetadas:** [/crypto](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/crypto/page.tsx)
- **Persona Analisada:** First-Time User (Cache limpo, sem integrações) & Steady-State User (Buscando conexão de carteiras)
- **Eixo Primário:** **Cognitive Clarity** (Transparência de estados simulados e features futuras)
- **Eixo Secundário:** **Conversion** (Engajamento na CTA de conexão e ativação)

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | Ambas | Usuário acessa `/crypto`. Ocorre uma renderização instantânea com animação sutil, exibindo o grid de ativos, valor zerado com moedas de exemplo, sparklines fluidos e CTA de carteira em espera. | Renderização client-side imediata e estável. `useMemo` computa os sparklines sem latência de rede. Backdrops e brilhos neon carregados perfeitamente. | `=` | Verified | **Nenhum**. O impacto estético inicial atende ao mais alto padrão internacional (*wow-factor* de alta fidelidade). |
| **2** | Steady-State | Usuário interage com os cards de BTC, ETH e SOL para avaliar flutuações e detalhes de mercado. Transições de escala tridimensionais suaves e luz difusa neon correspondente ao ativo. | Transições CSS via Tailwind executadas de forma impecável (`hover:scale-[1.02] duration-300`). Efeito de *glowing neon* reativo responde perfeitamente. | `=` | Verified | **Nenhum** em termos de feedback físico; excelente sensação de responsividade. |
| **3** | Steady-State | Usuário busca visualizar os preços reais e a variação ao vivo dos principais criptoativos do mercado para tomada de decisão financeira rápida. | Preços exibidos como `"—"`, saldos em `R$ 0,00` e sparklines estáticos gerados por fórmulas senoidais baseadas em sementes fixas (`sparkSeed`). | `!=` | Verified | **[MÉDIA FRICÇÃO]** A estaticidade dos preços confunde o usuário que espera um monitor funcional ativo, minando a utilidade diária da ferramenta. |
| **4** | Steady-State | Usuário decide conectar sua exchange centralizada ou carteira on-chain (ex: MetaMask) clicando na CTA "Conectar Exchange". | O botão possui o atributo `disabled` nativo e classes `cursor-not-allowed`, agindo como um fim de linha intransponível. | `XX` | Verified | **[BLOCKER]** Abandono imediato do fluxo de conversão. O usuário não tem alternativa de ação (ex: lista de espera, sandbox mock ou integração simulada). |

---

## 🔬 Detalhamento de Estados por Step

### Step 1: Render Inicial da Página `/crypto`
- **Input:** Clique na opção "Cripto" na [Sidebar](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/components/Sidebar.tsx) ou navegação direta para `/crypto`.
- **System:** 
  - O Next.js renderiza a rota do lado do cliente (`'use client'`).
  - O hook `useMemo` na linha 98 chama `generateSparkline(seed)` para cada ativo no array de metadados fixo:
    - BTC: `sparkSeed: 42`, variação teórica: `+2.34%`
    - ETH: `sparkSeed: 27`, variação teórica: `-1.12%`
    - SOL: `sparkSeed: 65`, variação teórica: `+5.87%`
- **Output:** 
  - Interface escura de altíssimo contraste baseada em `slate-950`.
  - Grid de 3 colunas exibindo os cards com glow dinâmico baseado na cor de cada blockchain (BTC: `#f7931a`, ETH: `#627eea`, SOL: `#9945ff`).
  - Gráfico linear SVG renderizado via `sparklineToPath` com gradiente de preenchimento (`url(#grad-[symbol])`) de opacidade `0.3` a `0`.
- **Side Effects:** Nenhum (puramente render local sem chamadas HTTP externas ou escritas).
- **Backstage:** Nenhuma atividade assíncrona ou de fila pendente.

### Step 2: Hover nos Cards dos Ativos
- **Input:** Mouse do usuário passa por cima de um dos cards de ativos no grid.
- **System:** O motor de renderização do navegador detecta e aplica as classes de hover utilitárias do Tailwind CSS.
- **Output:**
  - O card escala suavemente de forma 3D (`scale-[1.02]`) ao longo de `300ms` usando curvas de transição suaves.
  - O elemento absolute blur do glow interno aumenta a sensação tridimensional ao reagir à proximidade do cursor.
- **Side Effects:** Nenhum.
- **Backstage:** Nenhum.

### Step 3: Interação com a CTA de Carteira
- **Input:** Clique no botão desabilitado "Conectar Exchange" ou hover sobre o elemento.
- **System:** O React bloqueia o disparo de qualquer manipulador de eventos devido à propriedade nativa `disabled={true}` no elemento HTML `<button>`.
- **Output:** O cursor do mouse muda para o estilo `cursor-not-allowed` e a cor do texto do botão permanece esmaecida em `emerald-400/60` com fundo `emerald-500/20`. O badge superior "Em Breve" se mantém fixo sem animação adicional.
- **Side Effects:** Nenhum.
- **Backstage:** Nenhum.

---

## 👻 Phantom Flows Detectados
Não foram encontrados endpoints órfãos, APIs não documentadas ou caminhos mortos no diretório `/src/app/crypto`. O arquivo [page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/crypto/page.tsx) é enxuto, bem estruturado, limpo e devidamente indexado no menu global da sidebar. Trata-se puramente de uma **Fronteira Incompleta de Produto** (uma tela mock de alta fidelidade que aguarda implementação de backend e APIs).

---

## ⚡ Recomendações e Plano de Correção

Para transformar uma interface puramente conceitual em uma experiência genuinamente funcional de padrão mundial (*world-class*), propomos a divisão da implementação nos seguintes custos de engenharia e complexidade:

| Categoria | Gargalo / Fricção Identificada | Solução Proposta | Custo (S/M/L) |
| :--- | :--- | :--- | :--- |
| **UI/UX / Gamification** | O botão de carteira está desativado com `disabled`, gerando um beco sem saída cognitivo. | **Ativar Modo Sandbox / Mock Simulator:** Adicionar uma chave de estado local `isMockConnected`. Quando o usuário clica no botão, uma carteira fictícia é "conectada" com sucesso. A tela inteira se transforma: o saldo do portfolio assume valores dinâmicos simulados (ex: `R$ 42.890,50`), as quantidades e saldos dos ativos no grid são populados automaticamente e uma notificação do tipo Toast é disparada com animações fluidas. | **S** (Small) |
| **Integrations / API** | Preços estáticos `"—"` que diminuem a fidelidade e utilidade técnica do dashboard. | **Integração Real-Time com API Pública de Cotações:** Substituir os valores estáticos por uma chamada leve client-side (ou via Next.js Server Action com cache estrito de 60 segundos no Vercel Data Cache) para a API gratuita do **CoinGecko** ou **CoinCap**. Fazer o fetch das cotações atuais de BTC, ETH e SOL, computando o saldo correspondente a partir das cotações reais. | **M** (Medium) |
| **Architecture / Web3** | Falta de sincronização on-chain real e custódia segura. | **Arquitetura de Conexão Web3 Nativa:** Implementar conexão real de carteiras não custodiais usando o framework **wagmi** e componentes **RainbowKit** ou **AppKit** (WalletConnect). Adicionar um endpoint em Next.js para consultar o saldo de carteiras públicas (Ethereum/Solana) através de um provedor de RPC (Alchemy, QuickNode) ou API de indexação multi-chain, salvando as chaves públicas vinculadas ao ID de usuário autenticado no Supabase com políticas RLS estritas de isolamento. | **L** (Large) |

---

## 🏓 Handoff de Especialistas

- **Para /hm-designer:** Refinar a transição visual do botão "Conectar Exchange" quando ativo, desenhando os estados de "Connecting..." com micro-animações de spin e as modais de seleção de exchanges/wallets com efeito *glassmorphism* avançado.
- **Para /hm-engineer:** Planejar o schema do banco de dados no Supabase para armazenar as credenciais criptografadas de APIs das exchanges dos usuários (utilizando criptografia simétrica AES-256 a nível de banco de dados ou Vault de segurança de chaves).
- **Para /hm-qa:** Validar se a simulação do mock simulator não interfere na segurança global das sessões de usuários reais e garantir que dados simulados sejam claramente identificados como demonstrativos para evitar problemas de compliance financeiro.
- **Para /hm-performance:** Avaliar o impacto no tamanho do bundle javascript ao importar pacotes de Web3 (`viem`, `wagmi`), aplicando *dynamic imports* (Lazy Loading) nos componentes de blockchain para manter o First Contentful Paint (FCP) abaixo de 800ms.
