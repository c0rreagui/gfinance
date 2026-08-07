## 2026-06-11T22:54:15Z
You are teamwork_preview_worker_milestone1_2.
Your working directory is d:\APPS - ANTIGRAVITY\G-Hub\.agents\teamwork_preview_worker_milestone1_2\.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the robust retry mechanism with exponential backoff for Gemini calls (SDK and REST) in CPO and CFO assistants, improve error handling, and ensure database consistency:

1. In d:\APPS - ANTIGRAVITY\G-Hub\src\lib\gemini.ts:
   - Implement a robust check `is429Error(err: any): boolean` that identifies 429 quota/rate limit errors (either from SDK exceptions or custom REST response messages).
   - Implement `withRetry` helper to execute Gemini operations with exponential backoff retries (up to 3 retries, delay of 1s, 2s, 4s based on Math.pow(2, attempt - 1) * 1000).
   - Implement `sendMessageWithRetry(chat: any, message: string | any[]): Promise<any>` using `withRetry`.
   - Wrap all `chat.sendMessage` calls (lines 537 and 820) inside `generateFinancialResponse` with `sendMessageWithRetry`.
   - Wrap REST calls inside `callGeminiREST` and SDK calls inside `parseStatementWithAI` with `withRetry`.
   - Export `withRetry`.

2. In d:\APPS - ANTIGRAVITY\G-Hub\src\lib\gemini-work.ts:
   - Implement the same `is429Error`, `withRetry`, and `sendMessageWithRetry` logic.
   - Wrap all `chat.sendMessage` calls (lines 277 and 417) inside `generateWorkResponse` with `sendMessageWithRetry`.

3. In d:\APPS - ANTIGRAVITY\G-Hub\src\lib\memory.ts:
   - Import `withRetry` from `./gemini`.
   - Wrap the compaction generateContent call `model.generateContent(compactionPrompt)` (line 103) with `withRetry`.

4. In d:\APPS - ANTIGRAVITY\G-Hub\src\app\api\ai\chat\route.ts:
   - Update the user message insertion in Step 5 (line 109) to use `.select('id').single()` and store the inserted message's ID in a variable (e.g. `insertedUserMessageId`).
   - In the API route catch-all block, if `insertedUserMessageId` is set, run a rollback deletion query: `await supabase.from('chat_messages').delete().eq('id', insertedUserMessageId);` to prevent orphaned messages on AI failure.
   - Adjust the route catch-all block to inspect if the error is a 429/quota error, and return a JSON payload with a clear error message in Portuguese: `"O limite temporário de requisições foi atingido. Por favor, aguarde alguns segundos antes de tentar novamente."` and a 429 status code. Return a generic 500 status code for other errors.

Verification:
- Run `npm run build` and `npm run lint` to ensure the project builds and lint checks pass cleanly.
- Document the build and lint output in your handoff report.

Write your final status and verification output to handoff.md in your working directory (d:\APPS - ANTIGRAVITY\G-Hub\.agents\teamwork_preview_worker_milestone1_2\). When completed, send a message to your parent (conversation ID: a0078fd0-4501-4899-b333-b8259baaf316) detailing the path to your handoff.md.
