---
title: "UX Audit - Fonte de Dados (Integrations & Sync)"
date: 2026-05-27
author: Antigravity
type: ux-audit
status: completed
verdict: REDESIGN
tags:
  - ux-audit
  - integrations
  - sync
  - finance
---

# UX FLOW AUDIT: Fonte de Dados (Integrations & Sync)

**Projeto:** G-Finance  
**Analista:** Antigravity (Advanced AI UX/UI Psychologist)  
**Data:** 2026-05-27  
**Foco:** Qualidade de Decisão, Carga Cognitiva, Transparência de Handshake e Resiliência de Fluxo  

---

## 1. Mapeamento do Fluxo Geral

*   **Fluxo Principal:** A rota [/integrations](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/integrations/page.tsx) serve como a central de ingestão de dados. O fluxo compreende:
    1.  **Gateway de Captura (SMS):** O usuário copia a URL de webhook para configurar uma automação local no iOS Shortcuts para ler SMS do Itaú e disparar requisições POST automáticas.
    2.  **Importação de Arquivos:** Arrastar ou selecionar extratos bancários (.PDF, .OFX, .CSV), visualizar progresso e clicar em "Processar Extrato" para análise local e persistência no banco de dados.
    3.  **Log de Operações:** Histórico de auditoria que lista as transações importadas, status de sincronização e duplicatas rejeitadas para garantir integridade.
*   **Total de Passos Estáticos/Interativos:** 3 fluxos paralelos na mesma tela.
*   **Decisões do Usuário:**
    *   Decidir configurar a automação do celular (iOS Shortcuts) compartilhando seus dados de SMS.
    *   Decidir qual arquivo de extrato enviar e quando acionar o processamento.
    *   Avaliar os logs de importação para validar a consistência e integridade dos saldos recalculados.

---

## 2. Análise Detalhada de Decisões

### A. Decisões Desnecessárias
*   **Seleção Manual de Extensão de Arquivo:**
    *   *Friction/Problema:* Embora o dropzone detecte automaticamente a extensão do arquivo, as instruções e mensagens de erro forçam o usuário a pensar ativamente sobre o formato do arquivo antes de arrastar (`"PDF, OFX ou CSV"`). Como o backend faz o parse de forma inteligente e autônoma baseada na assinatura ou extensão, o usuário não precisaria se preocupar com isso se houvesse uma simplificação de affordance de upload ("Arraste seu extrato bancário aqui").
*   **Refresh Manual de Logs de Operações:**
    *   *Friction/Problema:* A presença de um botão de atualização manual (`RefreshCw`) para os logs transfere a responsabilidade de sincronia da UI para o usuário. Em uma arquitetura world-class, o log deve atualizar instantaneamente via Web Sockets/Supabase Realtime assim que a Edge Function de SMS ou o upload do backend forem bem-sucedidos.
    *   *Fix:* Remover o botão de refresh ou mantê-lo apenas como atalho de emergência, tornando a atualização da lista em tempo real automática.

### B. Decisões Mal Posicionadas
*   **Instalação Upfront do iOS Shortcuts sem Validação Própria:**
    *   *Friction/Problema:* A interface apresenta as instruções passo-a-passo para a automação no iOS Shortcuts diretamente na tela de integrações principais, antes mesmo do usuário ter dados importados ou entender o valor da automatização. Essa decisão de configurar um fluxo complexo e manual no celular é apresentada cedo demais e de forma crua, sem demonstrar a simplicidade e a segurança do modelo zero-trust.
    *   *Fix:* Mover o tutorial detalhado de Shortcuts para uma janela modal secundária ("Ver tutorial de automação") ou um link "Como funciona?", mantendo a interface limpa e focada no endpoint e na status-badge de payload.

### C. Decisões Sem Informação Suficiente
*   **Conexão Fantasma & Simulador Silencioso (O Blocker do mTLS Sync):**
    *   *Friction/Problema:* O endpoint de backend [/api/itau/sync](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/api/itau/sync/route.ts) contém uma lógica de fallback silenciosa para simulação de Sandbox quando as chaves `ITAU_CERT_PEM` e `ITAU_KEY_PEM` não estão presentes no servidor. O usuário que aciona o sincronismo direto de sua conta (ou que estuda o código) clica na esperança de conectar-se com lançamentos de produção da sua conta corrente Itaú, mas é alimentado com transações mockadas de sandbox. A UI oculta totalmente o "modo" (Real vs Sandbox Simulation), induzindo o usuário ao erro cognitivo de acreditar que está visualizando seu saldo consolidado real em tempo real.
    *   *Fix:* Retornar o `mode` no JSON de resposta e renderizar obrigatoriamente um badge visível no cabeçalho ou nos logs de sincronização (ex: "Simulação de Sandbox" ou "Produção Real mTLS").
*   **Blackbox do Gemini AI Fallback Parser:**
    *   *Friction/Problema:* Quando o usuário faz upload de um extrato PDF e o parser estático de regex falha (retornando 0 lançamentos), o backend desvia o fluxo silenciosamente para a API do Gemini AI para extração via LLM. Esse desvio adiciona 3 a 5 segundos de processamento de rede e inferência. Para o usuário, a interface exibe apenas mensagens de loader genéricas ("Analisando estrutura...", "Processando..."), gerando ansiedade e a impressão de instabilidade do servidor. O usuário não sabe se o processamento é inteligente, se seus limites de cota de IA estão sendo consumidos, ou se o arquivo falhou.
    *   *Fix:* Exibir uma mensagem de status transparente quando o parser inteligente for ativado (ex: "O parser estático falhou. Ativando parser inteligente com IA do Gemini..."). Além disso, o log deve explicitar na interface que o método de ingestão foi inteligente (o backend grava `pdf_ai` no banco, mas a UI renderiza apenas "Arquivo").

---

## 3. Catálogo de Pontos de Friction (UX Friction Points)

### Friction 1: O Webhook Fantasma de SMS (Dead-End Ingestion)
*   **Descrição:** A Edge Function `/sms-webhook` recebe os payloads de SMS do iOS Shortcuts com sucesso, valida os campos e retorna HTTP 200. No entanto, ela **não persiste os dados no banco de dados** nem os insere na tabela `transactions`. O fluxo de ponta a ponta está interrompido no backend. O usuário faz o setup complexo no celular, testa a automação, recebe a mensagem de sucesso no iOS Shortcuts, mas os logs e saldos na plataforma web continuam intactos. Isso quebra totalmente a integridade de fluxos e gera profunda desconfiança.
*   **Impacto:** Crítico (Bloqueador de Feature). O usuário se sente frustrado com a ausência de feedback após o esforço de configuração manual no celular.
*   **Fix:** Implementar o cliente Supabase na Edge Function para parsear o texto de SMS com Gemini e persistir as transações automaticamente.

### Friction 2: Hardcoded Webhook URL na UI
*   **Descrição:** A URL do webhook é definida diretamente no client-side como uma string estática (`'https://jdliepgseoyoxfygmdet.supabase.co/functions/v1/sms-webhook'`). Em ambientes locais de desenvolvimento ou em novas instâncias do Supabase autogestionadas pelo usuário, a URL apontará incorretamente para a instância padrão do G-Finance global, gerando vazamento de dados de teste ou quebra silenciosa do fluxo de ingestão.
*   **Impacto:** Médio/Arquitetural. Dificulta a portabilidade do projeto e expõe endpoints globais.
*   **Fix:** Expor a URL do webhook a partir de variáveis de ambiente do backend ou construir a URL de forma dinâmica a partir do domínio atual do Supabase.

### Friction 3: Feedback de Impacto Ausente (Saldos em Background)
*   **Descrição:** Quando um extrato é importado com sucesso, os saldos globais (`Saldo Total`, `Receitas`, `Despesas`) são recalculados na tabela `balances` do banco de dados pelo backend. No entanto, a tela de integrações não exibe nenhuma prévia ou variação dos saldos resultantes. O usuário é forçado a abandonar a página e navegar para o dashboard principal para verificar se as transações afetaram corretamente suas finanças.
*   **Impacto:** Médio. Quebra a fluidez e exige cliques extras de navegação para conferir os resultados.
*   **Fix:** Exibir um pequeno card de resumo ou preview financeiro do impacto da importação após a conclusão do upload (ex: "+R$ 1.840,26 adicionados ao Saldo Total").

---

## 4. Auditoria de Estados Especiais

### Recovery de Erro (Error Recovery)
*   **Cenário de Falha de Rede ou Ingestão:**
    *   *Status:* **Básico/Insuficiente**.
    *   *Comportamento:* Erros de parse ou formato inválido exibem banners vermelhos no topo. No entanto, falhas físicas de rede ou de timeout limpam os loaders mas deixam o arquivo selecionado no estado do input sem instruções claras sobre o que causou o problema. O usuário fica sem saber se deve re-enviar, se o arquivo é muito grande ou se o servidor caiu.
    *   *Fix:* Adicionar microcopy explicativo detalhado em falhas de rede (ex: "Não foi possível conectar ao gateway de processamento. Verifique se o extrato excede 10MB ou tente novamente em instantes.").

### Empty States (Estados Vazios)
*   **Log de Operações Vazio:**
    *   *Status:* **Deceptivo (Ícone de Erro)**.
    *   *Comportamento:* Quando não há logs de sincronização, a UI exibe o ícone `XCircle` (círculo com X vermelho/cinza). Psicologicamente, `XCircle` representa **erro grave**, gerando susto cognitivo ("Será que o sistema quebrou?"). Um estado vazio saudável não deve usar símbolos de falha cibernética.
    *   *Fix:* Substituir `XCircle` por `Clock` ou `HelpCircle`, alterando a mensagem para incentivar a primeira importação manual ou atalho de automação.

### Loading States (Estados de Carregamento)
*   **Refresh de Histórico de Ingestão:**
    *   *Status:* **Incompleto**.
    *   *Comportamento:* O painel de logs exibe skeletons elegantes de shimmer no carregamento inicial da página. No entanto, ao acionar a atualização de logs (`RefreshCw`), não há loader na lista de logs (apenas o ícone no botão gira), dando a sensação de tela congelada se a requisição demorar.
    *   *Fix:* Adicionar uma camada de opacidade suave (`opacity-50`) com shimmer na lista de logs existente durante o refresh assíncrono para dar affordance de carregamento em progresso.

---

## 5. Veredicto Final de UX

### **VEREDICTO: REDESIGN**

> [!CAUTION]
> A página de ingestão de dados apresenta problemas estruturais graves em nível de fluxo e integridade. O maior blocker reside na **Quebra de Expectativa Fictícia** do Gateway de SMS (Friction 1), onde o usuário realiza o setup complexo no celular, recebe retorno de sucesso HTTP 200 da Edge Function, mas as transações nunca são salvas. Adicionalmente, a lógica oculta de simulação de sandbox no mTLS sem distinção visual na UI (Decisão Sem Informação) e a falta de affordance no parser Gemini degradam severamente a experiência de controle do usuário.
>
> Recomenda-se um redesign lógico focado na integridade real do fluxo de ponta a ponta e na transparência total sobre a procedência dos dados.

---

### Plano de Ação Recomendado (Próximos Passos de Engenharia)

1.  **Resolver Webhook de SMS:** Conectar a Edge Function `sms-webhook` ao cliente de banco de dados do Supabase utilizando o Gemini AI para estruturar semanticamente o texto do SMS e persistir lançamentos reais na tabela `transactions`.
2.  **Implementar o Botão de Sincronização mTLS na UI:** Integrar um painel ou botão explícito "Sincronizar Conta Itaú" que chame o endpoint `/api/itau/sync` e renderize um badge visual dinâmico com o modo resultante da conexão (`mTLS Production` vs `Simulation Sandbox`).
3.  **Transparência no Parser Inteligente:** Atualizar as mensagens do loader de processamento de arquivos para indicar quando o Gemini AI fallback foi ativado (evitando ansiedade de lentidão) e expor a marcação de ingestão via IA nos logs.
4.  **Ajustar Feedback Visual do Empty State:** Substituir o ícone de falha `XCircle` por um ícone neutro de instrução ou histórico na lista de logs zerada.
5.  **Adicionar Realtime nos Logs:** Acoplar um listener de Supabase Realtime na tabela `itau_sync_logs` para que novas inserções em background (via automações SMS ou upload) atualizem a UI instantaneamente sem necessidade de refresh manual.
