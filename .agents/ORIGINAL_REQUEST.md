# Original User Request

## 2026-06-11T22:47:22Z

O projeto consiste em implementar um mecanismo de retentativa robusto com recuo exponencial (exponential backoff) para chamadas do Gemini nos analistas CPO e CFO, corrigindo erros de limite de cota de requisições (429) no Vercel.

Working directory: d:\APPS - ANTIGRAVITY\G-Hub
Integrity mode: development

## Requirements

### R1. Mecanismo de Retentativa com Backoff Exponencial
- Criar um helper `sendMessageWithRetry` no analista CPO ([gemini-work.ts](file:///d:/APPS%20-%20ANTIGRAVITY/G-Hub/src/lib/gemini-work.ts)) e CFO ([gemini.ts](file:///d:/APPS%20-%20ANTIGRAVITY/G-Hub/src/lib/gemini.ts)).
- O helper deve interceptar erros HTTP 429 (Too Many Requests / Quota Exceeded) do SDK do Gemini e tentar novamente até 3 vezes, aguardando 1 segundo na primeira falha, 2 segundos na segunda, etc. (multiplicador de backoff exponencial).

### R2. Otimização e Tratamento de Erros na API de Chat
- Ajustar a rota de API ([route.ts](file:///d:/APPS%20-%20ANTIGRAVITY/G-Hub/src/app/api/ai/chat/route.ts)) para tratar falhas persistentes do Gemini de forma amigável no JSON de retorno, evitando expor mensagens cruas do SDK na UI.

### R3. Análise Prévia de Falhas e Rastreamento de Erros
- Executar buscas detalhadas nos arquivos de código e nas tabelas de chat do banco de dados (ex: `chat_messages` e `tasks`) para diagnosticar exatamente quais payloads e chamadas de ferramentas causaram falhas, garantindo que a correção seja 100% precisa.

## Acceptance Criteria

### Resiliência a Rate Limits
- [ ] O chat do CPO e do CFO resiste a picos de chamadas sucessivas. Se a API do Gemini responder com código 429, o backend realiza retentativas em segundo plano de forma transparente.
- [ ] O tempo total de execução com retentativas cabe dentro do limite de 60 segundos configurado no Vercel.

### Tratamento de Erros Amigável
- [ ] Se as retentativas falharem após 3 tentativas, a API de chat retorna uma mensagem em português clara sugerindo que o limite temporário de requisições foi atingido e para o usuário aguardar alguns segundos antes de tentar novamente, em vez de exibir a mensagem técnica `[GoogleGenerativeAI Error]`.
