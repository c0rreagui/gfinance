# Synthesis — CPO and CFO Assistant Separation

## Consensus
All three codebase explorers agree on the architectural approach and implementation details:
1. **Database Schema**:
   - Add a `module` column to `chat_sessions` (type text, with a check constraint limiting to `'finance'` or `'work'`, defaulting to `'finance'`).
   - Add an `ai_memory_work` column to `profiles` (type text, defaulting to `''`).
   - Add a composite index on `(user_id, module, updated_at DESC)` for efficient session lists.
2. **API Routes**:
   - `/api/ai/sessions` (GET): Filter by `module` query parameter.
   - `/api/ai/sessions` (POST): Accept `module` in request body and insert it.
   - `/api/ai/chat` (POST): Accept `module` parameter. Identify the module. Load `ai_memory` or `ai_memory_work` accordingly. For `'finance'`, query finance tables and run `generateFinancialResponse`. For `'work'`, query G-Work tables, load `contexto.md`, and run a new `generateCpoResponse` pipeline with database tool access.
   - History compaction: In `src/lib/memory.ts`, support compacting either `ai_memory` or `ai_memory_work` depending on the active module.
3. **UI / Frontend**:
   - Detect route using `usePathname()`.
   - Under `/tasks`: Title is "CPO Assistant", theme uses Blue/Sky branding, suggestions focus on productivity/tasks, pass `module: 'work'`.
   - Elsewhere: Title is "CFO Assistant", theme uses Emerald branding, suggestions focus on finances, pass `module: 'finance'`.

## Resolved Conflicts
No major conflicts.
- *Default module value*: Existing chat sessions should default to `'finance'` to ensure backward compatibility and prevent user data loss.
- *Tool boundaries*: The tool definitions for CPO Assistant will map to database functions manipulating G-Work tables (`tasks`, `tasks_projects`, `transcriptions`, `ai_insights`) and will be strictly kept separate from financial schemas.

## Action Plan
1. Create a migration file under `supabase/migrations/` implementing:
   - `chat_sessions.module` column (default `'finance'`).
   - `profiles.ai_memory_work` column.
   - Composite index for filtered queries.
2. Implement backend logic:
   - DB compaction helper updates in `src/lib/memory.ts`.
   - API endpoints logic in `src/app/api/ai/chat/route.ts` and `src/app/api/ai/sessions/route.ts`.
   - CPO response generation handler in `src/lib/gemini.ts` (or a dedicated helper) implementing specific system prompt, injecting `contexto.md`, and invoking CPO database tools.
3. Implement UI components logic:
   - Dynamic path styling & properties in `src/components/GeminiFab.tsx` and `src/app/components/AiChatHub.tsx`.
4. Run validation and E2E checks.
