# Handoff Report — Separating G-Work (CPO) and G-Finance (CFO) Assistants

This handoff report is prepared by Explorer 2 to guide the implementation of database, API, UI, and test isolation.

---

## 1. Observation

Direct code observations from investigation:

- **Chat Sessions and Messages Schema**:
  In `supabase/migrations/20260601000000_chat_sessions_and_memory.sql`, we observe:
  ```sql
  create table public.chat_sessions (
      id uuid default gen_random_uuid() primary key,
      user_id uuid references auth.users(id) on delete cascade not null,
      title text default 'Nova Conversa' not null,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null,
      updated_at timestamp with time zone default timezone('utc'::text, now()) not null
  );
  ```
  And `profiles.ai_memory` is defined as:
  ```sql
  alter table public.profiles add column ai_memory text default '' not null;
  ```

- **Chat API Route**:
  In `src/app/api/ai/chat/route.ts` (lines 114-123), we observe:
  ```typescript
      // 2. Buscar o histórico de contexto do usuário (memória do agente)
      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_memory')
        .eq('id', user.id)
        .single();
      
      const aiMemory = profile?.ai_memory || '';
  ```
  It queries context from financial tables: `balances`, `transactions`, `goals`, `reminders`, `credit_cards`.
  At line 224, compaction is executed:
  ```typescript
      // 7. Disparar compactação assíncrona se passar do threshold (12 mensagens ativas)
      if (activeMessages.length >= 12) {
        console.log(`[AI Chat API] Thread ultrapassou limite. Iniciando compactação em background para o usuário ${user.id}`);
        // Dispara em background
        compactSessionHistory(supabase, user.id, finalSessionId).catch((err) => {
          console.error('[AI Chat API] Erro ao compactar histórico:', err);
        });
      }
  ```

- **Memory Compaction Helper**:
  In `src/lib/memory.ts` (lines 40-52), we observe:
  ```typescript
      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_memory')
        .eq('id', userId)
        .single();
      
      const currentMemory = profile?.ai_memory || '';
  ```
  And updates at lines 103-108:
  ```typescript
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ai_memory: newMemory,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
  ```

- **Sessions API Route**:
  In `src/app/api/ai/sessions/route.ts`, the endpoints list all chat sessions globally without module segment:
  ```typescript
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
  ```

- **UI Component Paths**:
  - `src/components/GeminiFab.tsx`: Uses `usePathname()` to hide on `/auth` but renders hardcoded green styles and "CFO Assistant" title.
  - `src/app/components/AiChatHub.tsx`: Integrates suggestions, placeholders, and thinking text geared exclusively towards financial context.

- **G-Work Tables**:
  - `public.tasks`, `public.tasks_projects`, `public.transcriptions`, `public.ai_insights`, `public.agent_memories` are fully structured and populated via migration files `20260529120000_tasks_and_transcriptions.sql`, `20260609_gwork_hierarchy_and_insights.sql`, and `20260609_create_agent_memories.sql`.

---

## 2. Logic Chain

1. **Observations on DB & APIs**: The `chat_sessions` table does not contain a category, tag, or module indicator, which causes all query routes (e.g. `GET /api/ai/sessions`) to pull both work and finance sessions indiscriminately.
2. **Observations on Profiles**: `profiles.ai_memory` is the only database string used to store conversational facts. Under this structure, chat interactions about G-Work tasks will pollute G-Finance compaction processes and leak work guidelines into finance prompts.
3. **Conclusion on Schema Changes**: To isolate histories and memories, a schema migration adding `chat_sessions.module` (`'finance' | 'work'`) and `profiles.ai_memory_work` is required.
4. **Observations on Routing and Components**: `GeminiFab.tsx` has access to `usePathname()`, which allows it to detect whether the user is viewing work dashboards (`/tasks`) or financial views.
5. **Conclusion on Component Logic**: We can hook pathname detection to change the component parameters dynamically, sending `module = 'work'` for `/tasks` sub-routes and `module = 'finance'` otherwise, and toggling copies and colors.
6. **Observations on Testing**: The repository contains no existing automated tests. Introducing Playwright allows spinning up simulated browser runs to authenticate, perform path checks, trigger isolated mock chats, and confirm database fields updates.

---

## 3. Caveats

- **External Gemini APIs**: Playwright E2E tests cannot hit the real external Google Generative AI API without API key exposure and non-deterministic results. The test suite design assumes route interception (`page.route()`) is used to mock Gemini API inputs.
- **Backwards Compatibility**: Existing users might already have records in `chat_sessions`. The database migration adds a check constraint but defaults to `'finance'` to avoid breakage.

---

## 4. Conclusion

Decoupling the CPO and CFO assistants is highly achievable with minimal changes to database and code layouts:
1. Perform database migrations to add `module` check constraint on `chat_sessions` and `ai_memory_work` column to `profiles`.
2. Update the `sessions` API to filter chat logs by `module` and write the module during creation.
3. Update the `chat` API to isolate LLM routing (CFO uses finance context & tools, CPO uses G-Work context & tools) and compaction targets.
4. Enhance `GeminiFab` and `AiChatHub` to customize copy, themes, suggestions, and parameterize calls.
5. Integrate E2E Playwright tests to assert strict segregation.

---

## 5. Verification Method

To verify the proposed implementation plan:

1. **Migration Verification**:
   Execute the migration SQL files. Verify that the table schema has columns:
   - `chat_sessions.module` (with CHECK constraint allowing `'finance'` or `'work'`).
   - `profiles.ai_memory_work`.
   Verify schema integrity via query:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'chat_sessions' AND column_name = 'module';
   ```

2. **Route and Component Validation**:
   - Access G-Work tasks (`/tasks/kanban`). Check if the Gemini FAB changes to Blue/Indigo and title becomes "CPO Assistant".
   - Access Finance pages (`/finance`). Check if the Gemini FAB remains Green and title is "CFO Assistant".
   - Verify that chat histories listed under `/tasks` do not list chats created under `/finance`.

3. **E2E Playwright Tests**:
   Install and run the tests:
   ```powershell
   npm install -D @playwright/test
   npx playwright install chromium
   npx playwright test
   ```
   All isolation and adaptive UI tests in `tests/e2e/` must pass.

---

## 6. Remaining Work

The following tasks are assigned to the implementer agent:
1. Create the database migration file in `supabase/migrations/` to implement the schema changes.
2. Implement backend updates in `src/app/api/ai/chat/route.ts`, `src/app/api/ai/sessions/route.ts`, and `src/lib/memory.ts`.
3. Implement frontend changes in `src/components/GeminiFab.tsx` and `src/app/components/AiChatHub.tsx`.
4. Create the `tests/e2e` directory and write the Playwright specifications outlined in the analysis report.
5. Execute the tests and verify that the requirements are fully satisfied.
