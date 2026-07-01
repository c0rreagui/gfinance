<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:loop-engineering-rules -->
# Loop Engineering Constraint

Whenever designing backend routes, external API integrations (such as LLM clients), or long-running tasks:
1. **Loop-based Execution**: Avoid assuming single-shot success. Implement robust loops for task resolution, retries, and sequential reasoning.
2. **Transient Error Handling**: Always catch transient errors (429, 502, 503, 504, rate limits, timeouts) and handle them using backoff retry logic (up to 3-5 attempts).
3. **Function Calling Loops**: Ensure that all LLM integrations run tool calling in a dynamic loop (e.g. up to 5 iterations) to resolve multiple database mutations and actions in a single chat turn.
<!-- END:loop-engineering-rules -->

<!-- BEGIN:integration-verification-rules -->
# Integration Verification & Graceful Degradation

Whenever implementing integrations with external APIs, databases, or third-party services:
1. **Active End-to-End Testing**: Do not rely solely on compile-time checks (`build`/`lint`). Proactively validate network availability and verify resource existence (e.g., endpoint status, model availability).
2. **User-Friendly Semantics**: Translate raw API failures (like HTTP 404 not found, 401 unauthorized, or 403 forbidden) into clear, actionable advice on the UI (e.g., "The selected model is not available on this Ollama host. Please check your model ID in Settings").
3. **Graceful Fallbacks**: Design systems that do not crash completely when third-party components fail; fall back to safe defaults or report semantic error details clearly to the user.
4. **Unrestricted Agent Access**: Always equip AI assistant endpoints with comprehensive tool definitions and database access capabilities (read and write). AI responses must never claim lack of access to mock or live variables when tools or system contexts are provided.
<!-- END:integration-verification-rules -->

<!-- BEGIN:vercel-deploy-rule -->
# Vercel Deployment Guardrail

Sempre que concluir e validar localmente uma funcionalidade ou correção:
1. **Commit & Push Obrigatórios**: Não encerre a tarefa ou o turno sem realizar o `git commit` e `git push origin main`.
2. **Deploy Trigger**: O commit e push no repositório remoto são indispensáveis, pois disparam o pipeline automático de build e deploy no Vercel.
<!-- END:vercel-deploy-rule -->
