# Analysis: Separating CPO and CFO Assistants

This analysis outlines the database schema, API routes, component implementations, and proposed changes to separate the conversational AI assistant into two isolated contexts: **CFO Assistant** (dedicated to G-Finance) and **CPO Assistant** (dedicated to G-Work).

---

## 1. Chat Session Database Schema and Queries

### 1.1 Table Definitions
The chat tables are defined in `supabase/migrations/20260601000000_chat_sessions_and_memory.sql`:
*   **`public.chat_sessions`**:
    *   `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    *   `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
    *   `title TEXT NOT NULL DEFAULT 'Nova Conversa'`
    *   `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
    *   `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
    *   *RLS Policy*: `Usuários podem gerenciar suas próprias sessões` allows full `ALL` access for `authenticated` users where `auth.uid() = user_id`.
*   **`public.chat_messages`**:
    *   `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    *   `session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE`
    *   `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
    *   `role TEXT NOT NULL CHECK (role IN ('user', 'model'))`
    *   `content TEXT NOT NULL`
    *   `is_compacted BOOLEAN NOT NULL DEFAULT false`
    *   `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
    *   *RLS Policy*: `Usuários podem gerenciar suas próprias mensagens` allows full `ALL` access for `authenticated` users where `auth.uid() = user_id`.

### 1.2 Query Touchpoints
The `chat_sessions` and `chat_messages` tables are currently queried in the following API routes:
1.  **`src/app/api/ai/chat/route.ts`**:
    *   Creates a session if `sessionId` is not provided (lines 68-81).
    *   Inserts user message into `chat_messages` (lines 104-115).
    *   Fetches uncompacted active message history: `.from('chat_messages').select('role, content').eq('session_id', finalSessionId).eq('is_compacted', false)` (lines 127-136).
    *   Inserts model response into `chat_messages` (lines 195-206).
    *   Updates `chat_sessions.updated_at` (lines 209-212).
2.  **`src/app/api/ai/sessions/route.ts`**:
    *   `GET` (lines 39-47): Fetches active sessions for the user: `.from('chat_sessions').select('id, title, created_at, updated_at, chat_messages!inner(id)').eq('user_id', user.id).order('updated_at', { ascending: false })`.
    *   `POST` (lines 99-110): Creates a new chat session with a specified title.
3.  **`src/app/api/ai/sessions/[id]/route.ts`**:
    *   `GET` (lines 43-48, 58-66): Validates session ownership and fetches all messages in a session: `.from('chat_messages').select('id, role, content, is_compacted, created_at').eq('session_id', sessionId)`.
    *   `DELETE` (lines 112-120): Deletes the chat session by ID, which cascades to delete all associated messages.
4.  **`src/lib/memory.ts`**:
    *   `compactSessionHistory` queries uncompacted messages (lines 25-30) and updates compaction state `is_compacted = true` (lines 113-121) before appending a system message indicating compaction (lines 126-138).

---

## 2. Profiles Table and Memory Management

### 2.1 Schema and RLS
Defined in `supabase/migrations/20260525000000_init_schema.sql` and `supabase/migrations/20260601000000_chat_sessions_and_memory.sql`:
*   **`public.profiles`**:
    *   `id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE`
    *   `full_name TEXT`
    *   `avatar_url TEXT`
    *   `pin TEXT`
    *   `google_drive_folder_id TEXT` (Google Drive monitor configurations)
    *   `google_drive_folder_name TEXT`
    *   `google_drive_last_sync_at TIMESTAMPTZ`
    *   `ai_memory TEXT DEFAULT ''` (Added as the perene/long-term memory column)
*   *Profile Creation*: Handled automatically upon signup by trigger `on_auth_user_created` calling database function `public.handle_new_user()`.
*   *RLS Policies*:
    *   `Allow users to view their own profile` (FOR SELECT USING `auth.uid() = id`).
    *   `Allow users to update their own profile` (FOR UPDATE USING `auth.uid() = id`).
    *   `Allow users to insert their own profile` (FOR INSERT WITH CHECK `auth.uid() = id` in `20260609_add_profiles_insert_policy.sql`).

### 2.2 Memory Access Flow
*   **Read**:
    *   `src/app/api/ai/chat/route.ts` (lines 118-124): Fetches `ai_memory` from `profiles` and passes it to `generateFinancialResponse(...)`.
    *   `src/lib/memory.ts` (lines 42-52): Fetches current `ai_memory` prior to semantic compaction.
    *   `src/app/gemini/page.tsx` (lines 190-204): Loads `ai_memory` to display/manage in the UI.
*   **Write (Compaction)**:
    *   `src/lib/memory.ts` (lines 103-106): Compresses active session messages using `gemini-2.0-flash` with a strict semantic consolidation prompt and writes the updated text back to `profiles.ai_memory`.

---

## 3. Chat Session and Request API Endpoints

*   **`src/app/api/ai/chat/route.ts`**: POST endpoint. It parses `{ message, sessionId }`, authenticates the user, loads `ai_memory`, loads uncompacted history, pulls full financial context (`balances`, `transactions`, `goals`, `reminders`, `credit_cards`), and calls `generateFinancialResponse(...)` which executes custom system rules and DB write/read tools in a tool loop.
*   **`src/app/api/ai/sessions/route.ts`**: GET/POST endpoints. GET retrieves a user's active chat sessions. POST initializes a new chat session with a default title.
*   **`src/app/api/ai/sessions/[id]/route.ts`**: GET/DELETE endpoints. GET fetches all messages of a session. DELETE deletes the session and cascades to delete all messages.

---

## 4. Analysis of GeminiFab and AiChatHub Components

### 4.1 `src/components/GeminiFab.tsx`
*   **Pathname Management**: Imports `usePathname` from `next/navigation`. If `pathname === '/auth'`, it returns `null` to hide the widget.
*   **Theme**: Fixed bottom-right element styled with a glowing dark glassmorphic card utilizing **emerald/teal** colors (indicative of G-Finance theme). Renders the panel header as `"CFO Assistant"` with a Lucide `Bot` icon.
*   **Panel toggle**: Manages local state `isOpen` to show/hide the panel overlay.
*   **Content Renders**: Injects `<AiChatHub isFloating={true} />`.

### 4.2 `src/app/components/AiChatHub.tsx`
*   **State Management**: Coordinates inputs, loading, errors, sessions list, history dropdown visibility, and message history.
*   **Templates/Suggestions**: hardcoded list of questions (lines 48-53):
    *   `'Qual é o meu saldo total?'`
    *   `'Resuma meus gastos recentes'`
    *   `'Como atingir minhas metas?'`
    *   `'Sugira dicas de economia'`
*   **API Interactions**:
    *   On mount, fetches active sessions via `GET /api/ai/sessions`. Loads the first active session's history via `GET /api/ai/sessions/[id]`.
    *   Sends user queries via `POST /api/ai/chat`, passing `{ message, sessionId: activeSessionId }`.
    *   Performs token handling via `getGoogleToken(...)` helper (fetching OAuth token client-side or calling `/api/auth/google-token`).
*   **Clear and New Chat**: Clears message state or sets `activeSessionId` to `null` to provision a new session on the next user prompt.
*   **Visual Style**: Dark Vercel-like card utilizing `border-white/5` with emerald accent lights, a custom spinner (spin-slow), and orange-to-amber input submit button.

---

## 5. G-Work Structure (Files and Database Tables)

G-Work is a hierarchical work-tracking and transcription analysis platform. It defines:

### 5.1 Tables & Schema
1.  **`public.tasks_projects`**:
    *   Defined in `supabase/migrations/20260529120000_tasks_and_transcriptions.sql`.
    *   Columns: `id`, `user_id`, `name`, `description`, `color`, `created_at`.
    *   RLS: `Usuários podem gerenciar seus próprios projetos de tarefas`.
2.  **`public.tasks`**:
    *   Defined in `20260529120000_tasks_and_transcriptions.sql` and altered in `20260609_gwork_hierarchy_and_insights.sql`.
    *   Columns: `id`, `user_id`, `project_id` (foreign key), `title`, `description`, `status` (check constraint for `backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled`), `priority` (check constraint for `critical`, `high`, `medium`, `low`, `none`), `due_date`, `type` (epic, feature, story, task), `parent_id` (hierarchy reference for tree structure), `sort_order`, `ai_generated`, `ai_confidence`, `source_transcription_id` (foreign key), `started_at`, `completed_at`, `created_at`, `updated_at`.
    *   RLS: `Usuários podem gerenciar suas próprias tarefas`.
3.  **`public.transcriptions`**:
    *   Defined in `20260529120000_tasks_and_transcriptions.sql` and altered in `20260609_gwork_hierarchy_and_insights.sql`.
    *   Columns: `id`, `user_id`, `file_name`, `google_drive_file_id`, `content`, `transcribed_at`, `project_id` (foreign key), `ai_summary`, `ai_insights`, `file_hash`, `extracted_entities` (JSONB cache), `processed_at`, `gemini_model`, `token_count`, `created_at`.
    *   RLS: `Usuários podem gerenciar suas próprias transcrições`.
4.  **`public.ai_insights`**:
    *   Defined in `20260609_gwork_hierarchy_and_insights.sql`.
    *   Columns: `id`, `user_id`, `insight_type` (`action_suggestion`, `deadline_warning`, `pattern_detected`, `priority_shift`), `title`, `body`, `severity` (`info`, `warning`, `critical`), `related_work_items` (UUID array), `related_transcriptions` (UUID array), `dismissed` (boolean), `acted_on` (boolean), `created_at`.
    *   RLS: `Users own insights select/insert/update/delete` (checks `auth.uid() = user_id`).
5.  **`public.agent_memories`**:
    *   Defined in `20260609_create_agent_memories.sql`.
    *   Columns: `id`, `user_id`, `memory_type` (default `'rule'`), `content`, `source_transcription_id`, `is_active`, `created_at`, `updated_at`.
    *   RLS: `Allow authenticated users complete ownership of their agent memories`.

### 5.2 G-Work API Endpoints
*   **`src/app/api/tasks/insights/route.ts`**: Fetches active insights (`GET`) and updates insight status like dismissing or acting on them (`PATCH`).
*   **`src/app/api/tasks/sync-drive/route.ts`**: Synchronizes `.md` transcriptions files from the Google Drive monitored folder. Checks file hash duplicates, downloading contents and storing them in `transcriptions`.
*   **`src/app/api/tasks/curate/chat/route.ts`**: Handles interactive curation. It loads the transcription, static memory templates (`persona.md`, `alma.md`, `funcoes.md`, `contexto.md`), active dynamic agent memories from `agent_memories`, and runs Gemini to update structural JSON drafts in `extracted_entities`.
*   **`src/app/api/tasks/curate/approve/route.ts`**: Persists approved curation. Inserts hierarchical work items (`tasks`), strategic insights (`ai_insights`), and new agent memories (`agent_memories`), updating the transcription to marked as processed.

### 5.3 G-Work Pages & Layout
*   `src/app/tasks/layout.tsx`: Renders the context provider which loads `projects`, `workItems`, `transcriptions`, and `insights` from the database. Syncs Google Drive in the background.
*   `src/app/tasks/page.tsx`: G-Work dashboard.
*   `src/app/tasks/hierarchy/page.tsx`: Interactive epic-feature-story-task hierarchy editor.
*   `src/app/tasks/kanban/page.tsx`: Drag and drop Kanban board.
*   `src/app/tasks/projects/page.tsx`: Projects manager.
*   `src/app/tasks/transcriptions/page.tsx`: Transcription list, audio review, and AI draft curator.

---

## 6. Blueprint for Isolating CPO and CFO Assistants

To fulfill the requirements, the system must split the chat session, memory contexts, models, prompts, tools, and UI.

### 6.1 Database Alterations (Migration Script Proposal)
Create a new migration (e.g. `20260611_separate_assistants.sql`):
```sql
-- 1. Add module column to distinguish between G-Finance (finance) and G-Work (work) sessions
ALTER TABLE public.chat_sessions 
  ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'finance' CHECK (module IN ('finance', 'work'));

-- Create an index to optimize session queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_module ON public.chat_sessions(module);

-- 2. Add CPO memory column to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS ai_memory_work TEXT DEFAULT '';
```

### 6.2 Frontend Interface Adaptations (`GeminiFab.tsx` & `AiChatHub.tsx`)
1.  **Detect Theme & Role from Path**:
    *   In `GeminiFab.tsx`, analyze the current URL:
        ```typescript
        const pathname = usePathname();
        const isWorkModule = pathname?.startsWith('/tasks');
        const moduleType = isWorkModule ? 'work' : 'finance';
        ```
    *   Pass the color theme, assistant header title, template suggestions, and `moduleType` dynamically to `<AiChatHub />`.
2.  **Color Codes**:
    *   `finance` (CFO): Keep **emerald** layout highlights and FAB colors.
    *   `work` (CPO): Use **blue** (`blue-500`, `text-blue-400`, etc.) theme for buttons, glow lines, borders, and pulse.
3.  **Visual Header**:
    *   `finance`: Title = `"CFO Assistant"`, Subtitle = `"Analista Pessoal e Predictor"`.
    *   `work`: Title = `"CPO Assistant"`, Subtitle = `"Gerenciamento de Entregáveis e Estratégia"`.
4.  **Templates (Suggestions)**:
    *   `finance`: Financial questions (existing).
    *   `work`: Work questions:
        ```typescript
        const workSuggestions = [
          'Quais tarefas estão pendentes?',
          'Crie um épico para o novo app',
          'Resuma os insights recentes',
          'Liste minhas tarefas críticas'
        ];
        ```
5.  **Pass Module Parameter to APIs**:
    *   All calls to `/api/ai/sessions` must append query string `?module=work` or `?module=finance`.
    *   All calls to `/api/ai/chat` must pass `{ message, sessionId, module }` in the POST body.

### 6.3 Backend API and Logic Scoping
1.  **`src/app/api/ai/sessions/route.ts`**:
    *   `GET`: Read search params `const { searchParams } = new URL(req.url); const module = searchParams.get('module') || 'finance';`. Filter queries by `.eq('module', module)`.
    *   `POST`: Extract `module` from body and insert it: `.insert({ user_id: user.id, title, module })`.
2.  **`src/app/api/ai/chat/route.ts`**:
    *   Extract `module` from request body. If `sessionId` is not provided, insert the new session with the specified `module`.
    *   Verify context boundaries:
        *   **If `module === 'work'`**:
            *   Fetch user memory from `profiles.ai_memory_work`.
            *   Do NOT load financial tables (`balances`, `transactions`, `goals`, `reminders`, `credit_cards`).
            *   Instead, load G-Work contexts: `tasks`, `tasks_projects`, `transcriptions`, `ai_insights`.
            *   Load static context profiles (`contexto.md`, `persona.md`, `alma.md`, `funcoes.md`).
            *   Call the Gemini API with CPO system prompt and configure CPO tools (`list_tasks`, `create_task`, `update_task`, `delete_task`, `list_projects`, `create_project`, `list_transcriptions`, `list_insights`, `update_insight`).
            *   On compaction, parameterize compaction helper to update `profiles.ai_memory_work`.
        *   **If `module === 'finance'`**:
            *   Keep existing behavior (access `profiles.ai_memory`, load only financial context, execute `generateFinancialResponse` with financial tools).

---

## 7. Proposed E2E Testing Framework (Blueprint)

Since the codebase currently has no formal test framework setup, we suggest configuring **Playwright** for E2E validation. It allows running tests against multiple browsers, supports robust network API interception, and fits seamlessly into Next.js.

### 7.1 Setup Requirements
Add testing configurations to the root of the project:
*   Install: `npm install -D @playwright/test`
*   Configure: `playwright.config.ts` (defining devServer, testDir, baseUrl).
*   Create directory: `tests/` for E2E tests.

### 7.2 Core Test Cases for Verification

#### Test Case 1: Session List Isolation (Boundary Test)
1.  **Setup**: Seed a test user with two sessions in `chat_sessions`:
    *   Session A: `module = 'finance'`, Title: "Investimento Selic"
    *   Session B: `module = 'work'`, Title: "Refatorar layout"
2.  **Steps**:
    *   Log in as test user.
    *   Navigate to `/finance` (CFO). Open the Gemini chat FAB.
    *   Open history drawer.
    *   **Assert**: "Investimento Selic" is visible. "Refatorar layout" is **not** visible.
    *   Navigate to `/tasks` (CPO). Open the Gemini chat FAB.
    *   Open history drawer.
    *   **Assert**: "Refatorar layout" is visible. "Investimento Selic" is **not** visible.

#### Test Case 2: Visual Themes and Labels (UI Test)
1.  **Steps**:
    *   Log in and navigate to `/cards` (Finance route).
    *   **Assert**: FAB background/pulse is emerald, header displays `"CFO Assistant"`.
    *   Navigate to `/tasks/kanban`.
    *   **Assert**: FAB background/pulse is blue, header displays `"CPO Assistant"`.

#### Test Case 3: CFO Context and Database Tool Segregation (Security & Tool Boundary)
1.  **Steps**:
    *   Open FAB under `/finance`.
    *   Type: "Crie uma tarefa chamada 'Refatorar RLS' com prioridade alta".
    *   **Assert**: The assistant refuses to execute tasks management, stating it doesn't have access to tasks tools, or the prompt system guides it to report it is a CFO assistant.
    *   Type: "Qual é o meu saldo total?".
    *   **Assert**: The assistant returns correct calculated balances from the DB.
    *   Type: "Adicione uma receita de R$ 500 chamada 'Venda monitor'".
    *   **Assert**: The assistant successfully triggers the `create_user_transaction` tool, and the transaction is inserted in the DB.

#### Test Case 4: CPO Context and Database Tool Segregation (Security & Tool Boundary)
1.  **Steps**:
    *   Open FAB under `/tasks`.
    *   Type: "Qual é meu saldo?".
    *   **Assert**: The assistant refuses to read financial metrics, stating it doesn't have access to G-Finance records.
    *   Type: "Crie uma tarefa chamada 'Ajustar layout' com prioridade alta".
    *   **Assert**: The assistant executes the `create_task` tool.
    *   Query the database using Supabase client to confirm that a task with title "Ajustar layout" and priority "high" exists for the user.

#### Test Case 5: Independent Sliding Window and Compaction (Memory Test)
1.  **Steps**:
    *   For the test user, send 13 consecutive mock messages in CPO chat.
    *   Verify that auto-compaction is triggered.
    *   **Assert**: Messages are marked `is_compacted = true` in the DB.
    *   **Assert**: `profiles.ai_memory_work` is updated, whereas `profiles.ai_memory` (CFO memory) remains unchanged.
