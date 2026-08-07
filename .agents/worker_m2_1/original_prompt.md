## 2026-06-11T16:29:46Z

You are Worker 1 for Milestone 2 (Database Isolation - R1).
Your working directory is: d:\APPS - ANTIGRAVITY\G-Hub\.agents\worker_m2_1
Your task is to:
1. Create a `PROJECT.md` file at the project root (`d:\APPS - ANTIGRAVITY\G-Hub\PROJECT.md`) based on the Project Pattern template, showing:
   - Project name: G-Hub CPO & CFO Assistant Separation
   - Architecture
   - Milestones
   - Interface Contracts
   - Code Layout
2. Implement Milestone 2 (Database Isolation - R1):
   - Create a database migration in `supabase/migrations/` to add the `module` column to `chat_sessions` (type text, CHECK constraint: `'finance'` or `'work'`, defaulting to `'finance'`), and the `ai_memory_work` column to `profiles` (type text, defaulting to `''`).
   - Run/apply the migration locally.
   - Update `src/lib/memory.ts` to support compacting `ai_memory_work` when module is `'work'` and `ai_memory` when module is `'finance'`.
   - Update `/api/ai/sessions` (both GET and POST handlers in `src/app/api/ai/sessions/route.ts`) to handle the `module` parameter/column.
3. Verify the database changes and verify that the code compiles using typescript compilation / build command.
4. Write your handoff report to `handoff.md` in your working directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
