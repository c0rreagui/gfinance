# Plan: Retry Mechanism and Error Improvement for Gemini Assistants

## Milestones

1. **Milestone 1: Exploration & Diagnosis**
   - Explore codebase: identify structure and Gemini client/SDK usage in `src/lib/gemini.ts`, `src/lib/gemini-work.ts`, and `src/app/api/ai/chat/route.ts`.
   - Query DB tables (`chat_messages`, `tasks`, etc.) using Supabase/SQL to diagnose failed payloads, tool calls, and error patterns.
   - Status: DONE

2. **Milestone 2: Backend Retry & Error Handling Implementation**
   - Create `sendMessageWithRetry` helper in `src/lib/gemini.ts` and `src/lib/gemini-work.ts` with exponential backoff (up to 3 retries, starting at 1s, then 2s, etc.) for 429 errors.
   - Adjust `src/app/api/ai/chat/route.ts` to return user-friendly error messages (in Portuguese) if the retries fail or if other persistent errors occur, preventing raw SDK errors from reaching the UI.
   - Status: IN_PROGRESS

3. **Milestone 3: Verification & Auditing**
   - Create tests/verifications to simulate 429 errors or check retry behavior.
   - Run compilation and tests, verify using Reviewer, Challenger, and Forensic Auditor.
   - Status: PLANNED
