# Handoff Report — Explorer 1

This is a **Hard Handoff** signifying the completion of the read-only exploration and test design phase for separating the CPO and CFO assistants.

---

## 1. Observations

### 1.1 Database Table Schema Definitions
*   **Chat sessions schema**:
    *   File: `supabase/migrations/20260601000000_chat_sessions_and_memory.sql` (lines 9-15):
        ```sql
        CREATE TABLE IF NOT EXISTS public.chat_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL DEFAULT 'Nova Conversa',
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        );
        ```
*   **User profiles and AI memory schema**:
    *   File: `supabase/migrations/20260525000000_init_schema.sql` (lines 2-8):
        ```sql
        CREATE TABLE public.profiles (
            id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
            updated_at timestamp with time zone,
            full_name text,
            avatar_url text,
            pin text
        );
        ```
    *   File: `supabase/migrations/20260601000000_chat_sessions_and_memory.sql` (lines 4-6):
        ```sql
        -- Adicionar coluna de memória no perfil do usuário
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_memory TEXT DEFAULT '';
        ```

### 1.2 Chat Request and Sessions API Routes
*   **Chat Request Processing**:
    *   File: `src/app/api/ai/chat/route.ts` (lines 118-124):
        ```typescript
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('ai_memory')
          .eq('id', user.id)
          .single();

        const aiMemory = profile?.ai_memory || '';
        ```
    *   File: `src/app/api/ai/chat/route.ts` (lines 182-192):
        ```typescript
        const resultText = await generateFinancialResponse(
          user.id,
          message,
          aiMemory,
          uncompactedMessages,
          supabase
        );
        ```
*   **Sessions List and Creation**:
    *   File: `src/app/api/ai/sessions/route.ts` (lines 39-47):
        ```typescript
        const { data: sessions, error } = await supabase
          .from('chat_sessions')
          .select('id, title, created_at, updated_at, chat_messages!inner(id)')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        ```

### 1.3 GeminiFab and AiChatHub Component Behaviors
*   **FAB Path Matching**:
    *   File: `src/components/GeminiFab.tsx` (lines 19-21):
        ```typescript
        const pathname = usePathname();
        if (pathname === '/auth') return null;
        ```
*   **Theme and Suggestions**:
    *   File: `src/app/components/AiChatHub.tsx` (lines 48-53):
        ```typescript
        const suggestions = [
          'Qual é o meu saldo total?',
          'Resuma meus gastos recentes',
          'Como atingir minhas metas?',
          'Sugira dicas de economia'
        ];
        ```
    *   Theme matches **emerald** gradients and highlights (e.g. `bg-emerald-500`, `text-emerald-400`, `shadow-emerald-500/20`).

### 1.4 G-Work Structures (Hierarchy and Insights)
*   **G-Work Tables**:
    *   Files: `supabase/migrations/20260529120000_tasks_and_transcriptions.sql` and `supabase/migrations/20260609_gwork_hierarchy_and_insights.sql` define the following tables:
        *   `tasks_projects` (projects tracking)
        *   `tasks` (supports `type` of epic, feature, story, or task, and `parent_id` hierarchy reference)
        *   `transcriptions` (audio transcriptions, metadata, and extracted entities draft)
        *   `ai_insights` (strategic project insights with `insight_type` and `severity`)
        *   `agent_memories` (persisted rules/guidelines dynamically loaded by the curation chat)

---

## 2. Logic Chain

1.  **Session & Memory Isolation (R1)**:
    *   *Premise*: We need to segregate chat histories and long-term memory between G-Finance (CFO) and G-Work (CPO).
    *   *Inference*:
        *   Adding a `module` column (`'finance' | 'work'`) to `chat_sessions` lets us filter sessions in `/api/ai/sessions` (GET) based on query parameters.
        *   Adding an `ai_memory_work` column to `profiles` lets the backend load the specific CPO memory in `/api/ai/chat` (POST) without interfering with the CFO's `ai_memory`.
2.  **CPO Core Backend & Tools (R2)**:
    *   *Premise*: The CPO Assistant needs strategic project context (`contexto.md`, `persona.md`, `alma.md`, `funcoes.md`) and direct database read/write access to tasks, projects, transcriptions, and insights, while being strictly isolated from financial records.
    *   *Inference*:
        *   When `/api/ai/chat` receives a query with `module === 'work'`, it must bypass financial queries and financial tool lists.
        *   Instead, it will load static CPO templates, load active dynamic guidelines from `agent_memories`, and call Gemini with a custom system prompt and a tool library mapping queries to database actions (e.g., `list_tasks`, `create_task`, `update_task`, `delete_task`).
3.  **Path-based Visual Presentation (R3)**:
    *   *Premise*: Under routes starting with `/tasks`, the interface must style the chat with blue colors, label it "CPO Assistant", and propose productivity suggestions. Under other routes, it stays emerald and labeled "CFO Assistant".
    *   *Inference*:
        *   Using `usePathname()` inside `GeminiFab.tsx` allows matching `pathname?.startsWith('/tasks')`.
        *   We can pass this boolean state to `AiChatHub` to toggle Tailwind color classes (blue vs. emerald), header labels, and suggestion arrays dynamically.

---

## 3. Caveats

*   **OAuth Token Scope**: The E2E tests assume a logged-in user session exists. For local test automation, we assume seed data with a pre-configured user profile pin/token can bypass OAuth screens or run using mock auth headers.
*   **Model Rate Limits**: Frequent tool execution loops can encounter rate limits on Gemini APIs. E2E tests should include appropriate timeouts or utilize mock Gemini client endpoints when testing UI layout and endpoint parameters.

---

## 4. Conclusion

The separation of the conversational assistant into isolated CFO and CPO instances is highly feasible and structurally elegant. By modifying database schemas, refining query logic inside API routes, and parameterizing visual themes inside `GeminiFab`/`AiChatHub` based on pathnames, we can deliver a world-class segregated agent framework.

---

## 5. Verification Method

### 5.1 Verification Commands
Verify typescript compilation and eslint rules after layout modifications:
*   `npm run lint`
*   `npm run build`

### 5.2 E2E Verification Blueprint
To run automated tests verifying correct segregation:
1.  **Configure Playwright**:
    Install Playwright: `npm install -D @playwright/test`
    Add `tests/assistant.spec.ts` matching the following test suite outline:
    *   `test('CFO assistant renders on G-Finance pages and isolates sessions')`
        *   Login -> Navigate to `/finance` -> Open FAB -> Verify emerald styling and "CFO Assistant" title.
        *   Verify chat session history lists only finance sessions.
        *   Ask: "Qual é o meu saldo?" -> Verify tool executes and retrieves balances.
    *   `test('CPO assistant renders on G-Work pages and isolates sessions')`
        *   Login -> Navigate to `/tasks` -> Verify blue styling and "CPO Assistant" title.
        *   Verify chat session history lists only work sessions.
        *   Ask: "Crie uma tarefa chamada 'Refatorar RLS'" -> Verify tool executes and task is inserted in the DB.
    *   `test('Tool execution boundaries are enforced')`
        *   Navigate to G-Finance -> Ask: "Liste minhas tarefas" -> Assert that it declines.
        *   Navigate to G-Work -> Ask: "Qual meu saldo?" -> Assert that it declines.
2.  **Run Tests**:
    *   `npx playwright test`
