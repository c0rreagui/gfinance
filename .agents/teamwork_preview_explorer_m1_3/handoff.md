# Handoff Report — Separation of CPO and CFO Assistants

## 1. Observation
1. **Migration Files**:
   - `supabase/migrations/20260601000000_chat_sessions_and_memory.sql` (lines 9-15):
     ```sql
     CREATE TABLE IF NOT EXISTS public.chat_sessions (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
         title TEXT NOT NULL DEFAULT 'Nova Conversa',
         created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
     );
     ```
   - `supabase/migrations/20260525000000_init_schema.sql` (lines 2-8): Defines the `profiles` table.
   - `supabase/migrations/20260601000000_chat_sessions_and_memory.sql` (lines 5-6):
     ```sql
     ALTER TABLE public.profiles 
       ADD COLUMN IF NOT EXISTS ai_memory TEXT DEFAULT '';
     ```
   - `supabase/migrations/20260529120000_tasks_and_transcriptions.sql`: Defines `tasks_projects`, `tasks`, and `transcriptions`.
   - `supabase/migrations/20260609_gwork_hierarchy_and_insights.sql` (lines 95-111): Defines the `ai_insights` table and expands the `tasks` schema with hierarchy fields (`type`, `parent_id`, `sort_order`, `ai_generated`, `source_transcription_id`, etc.).
   - `supabase/migrations/20260609_create_agent_memories.sql` (lines 2-11): Defines the `agent_memories` table for dynamic work facts/rules storage.

2. **API Routes**:
   - `src/app/api/ai/chat/route.ts` (lines 68-75): Inserts into `chat_sessions` without target module field; lines 118-122: queries `profiles` for `ai_memory`; lines 147-159: fetches financial table data.
   - `src/app/api/ai/sessions/route.ts` (lines 39-43): Lists user sessions without filtering by module.
   - `src/app/api/ai/sessions/[id]/route.ts` (lines 43-48): Verifies session ownership and lists all messages under that session.

3. **Frontend Components**:
   - `src/components/GeminiFab.tsx` (lines 10-13): Uses `usePathname()` to hide FAB on `/auth`; line 23: hardcoded "CFO Assistant" title; line 33: instantiates `<AiChatHub isFloating={true} />` without any props.
   - `src/app/components/AiChatHub.tsx` (lines 48-53): Hardcoded financial suggestions; line 80: queries `/api/ai/sessions` without params; lines 174-177: POSTs only `{ message, sessionId }` to `/api/ai/chat`.

---

## 2. Logic Chain
1. Since the chat system currently queries all sessions and all messages under a user globally without distinguishing their context, the conversations for G-Work and G-Finance will leak into each other's UI panels. Therefore, we must implement database-level isolation by adding a `module` column to `chat_sessions` and filter sessions by this module.
2. Since `profiles` only stores a single `ai_memory` value, both assistant personalities will overwrite the same long-term profile memory during history compaction. To avoid context confusion, we must introduce `profiles.ai_memory_work` and load it selectively.
3. Since the API chat execution route fetches and injects only financial tables (`balances`, `transactions`, etc.) and calls `generateFinancialResponse`, the assistant is completely unaware of the user's tasks, projects, transcriptions, and insights. Therefore, we must modify the route to load G-Work data when `module === 'work'` and feed it to a CPO prompt template utilizing the static memories and `agent_memories` table.
4. Since `GeminiFab` and `AiChatHub` hardcode their copy, suggestions, styles, and API calls to G-Finance, we must adapt them using Next.js pathnames to dynamically determine, style, and invoke the correct assistant (`'work'` under `/tasks` paths, `'finance'` otherwise).

---

## 3. Caveats
- This investigation assumes that the workspace uses Playwright or similar E2E frameworks, but no configuration or dependency for E2E tests was found in `package.json`. Thus, the test scripts proposed will require the installation of dependencies like `@playwright/test`.
- We assume that `/compact` triggers a full semantic consolidation of the current chat message log into the profile memory. When separating this, the compaction mechanism will need to split its prompts to focus either on project tasks or financial habits.

---

## 4. Conclusion
To cleanly separate the CPO and CFO assistants:
- Add a `module` column (enum/text check: `'finance' | 'work'`) to the `chat_sessions` table and create a combined index on `(user_id, module, updated_at DESC)`.
- Add `ai_memory_work` to the `profiles` table.
- Update UI components to read pathnames and dynamically toggle branding, themes (Sky for CPO, Emerald for CFO), suggestions, and API query parameters.
- Restructure API endpoints to filter sessions, load the appropriate profile memory column, fetch the correct context (G-Work vs. financial tables), and trigger the correct model prompt/compaction pipeline.

---

## 5. Verification Method
1. **Database Schema Integrity**: Run `npx supabase db lint` or inspect schema structure via the Supabase client to verify the presence of `chat_sessions.module` and `profiles.ai_memory_work`.
2. **Pathname & FAB UI**: Run `npm run dev` and navigate to `/tasks`. Open the FAB and inspect that the header states "CPO Assistant" (or similar CPO label), suggestion buttons correspond to task queries, and accent styles are blue. Navigate to `/finance` and verify that the FAB has emerald accents and states "CFO Assistant".
3. **Session Filtering**: Create sessions in each page and verify they do not appear in the other page's history list.
4. **Code Execution Build Check**: Run `npm run build` to ensure all TypeScript typings and references are completely resolved without compilation errors.
