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
