# Analysis — Separation of CPO and CFO Assistants

## 1. Executive Summary
This report analyzes the database schema, API routes, React components, and G-Work structures in G-Hub to outline the exact requirements for isolating the **CFO Assistant** (G-Finance) and the **CPO Assistant** (G-Work). Currently, the chat components and routes are tightly coupled to G-Finance (CFO). To support a first-class separation, we must isolate chat history sessions, perennial memory, and contextual database schemas, and render a dynamic, context-aware interface.

---

## 2. Database Schema Analysis

### 2.1. Chat Session Tables (`chat_sessions` & `chat_messages`)
- **Current Definition**:
  - Defined in `supabase/migrations/20260601000000_chat_sessions_and_memory.sql`.
  - `chat_sessions` holds the session metadata: `id`, `user_id` (foreign key to `auth.users`), `title` (default `'Nova Conversa'`), and timestamps.
  - `chat_messages` holds individual message entries: `id`, `session_id` (foreign key to `chat_sessions`), `user_id`, `role` (user or model), `content`, `is_compacted` (for history consolidation), and `created_at`.
- **Proposed Isolation Strategy**:
  - Add a `module` column to `chat_sessions` to identify the assistant module:
    ```sql
    ALTER TABLE public.chat_sessions 
      ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'finance' 
      CHECK (module IN ('finance', 'work'));
    ```
  - Create a combined performance index to quickly list user sessions per module:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_module 
      ON public.chat_sessions(user_id, module, updated_at DESC);
    ```

### 2.2. Profile Memory Table (`profiles`)
- **Current Definition**:
  - Defined in `supabase/migrations/20260525000000_init_schema.sql` and modified in `20260601000000_chat_sessions_and_memory.sql`.
  - User profiles contain avatar URLs, full names, pins, Google Drive tokens, and `ai_memory TEXT DEFAULT ''`.
- **Proposed Isolation Strategy**:
  - Keep `ai_memory` exclusively for the CFO Assistant (G-Finance).
  - Add `ai_memory_work` to hold CPO Assistant (G-Work) perennial memory:
    ```sql
    ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS ai_memory_work TEXT DEFAULT '';
    ```

### 2.3. G-Work Tables
The CPO Assistant requires exclusive access to G-Work tables, completely isolated from G-Finance data:
1. **`tasks`**: Manages hierarchical work items (`epic`, `feature`, `story`, `task`). Defined in `20260529120000_tasks_and_transcriptions.sql` and updated in `20260609_gwork_hierarchy_and_insights.sql`. Contains columns for hierarchy (`parent_id`), status (`backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled`), priority (`critical`, `high`, `medium`, `low`, `none`), and AI provenance (`ai_generated`, `ai_confidence`, `source_transcription_id`).
2. **`tasks_projects`**: Manages task projects. Contains `id`, `user_id`, `name`, `description`, `color`, and `created_at`.
3. **`transcriptions`**: Stores meeting and audio logs processed from Google Drive. Contains raw transcriptions (`content`), AI summaries (`ai_summary`), entities parsed by Gemini (`extracted_entities` JSONB), and text-based insights (`ai_insights`).
4. **`ai_insights`**: Stores tactical alerts. Fields include `insight_type` (`action_suggestion`, `deadline_warning`, `pattern_detected`, `priority_shift`), `severity` (`info`, `warning`, `critical`), and foreign key arrays (`related_work_items`, `related_transcriptions`).
5. **`agent_memories`**: Stores dynamic rules, facts, and preferences (`memory_type` = `'fact' | 'rule' | 'preference'`) extracted from transcriptions for agent self-improvement. Defined in `20260609_create_agent_memories.sql`.

---

## 3. API Route Analysis

### 3.1. Route `src/app/api/ai/chat/route.ts` (Chat Execution)
- **Current Behavior**:
  - Automatically provisions new chat sessions without a specified module.
  - Fetches the user profile's global `ai_memory`.
  - Queries financial tables (`balances`, `transactions`, `goals`, `reminders`, `credit_cards`) to inject as context into `generateFinancialResponse`.
  - Compacts session history into `profiles.ai_memory` after 12 active messages.
- **Proposed Changes for Separation**:
  - Accept a `module` parameter in the POST body (`{ message, sessionId, module }`). If `sessionId` is provided, verify its corresponding `module` matches.
  - **Memory Load**: If `module === 'work'`, load `profiles.ai_memory_work`; otherwise, load `profiles.ai_memory`.
  - **Context Ingestion**:
    - **Work (CPO)**: Fetch `tasks`, `tasks_projects`, `transcriptions`, `ai_insights`, and `agent_memories`.
    - **Finance (CFO)**: Fetch `balances`, `transactions`, `goals`, `reminders`, and `credit_cards`.
  - **Model & Persona Dispatches**:
    - For `work`, call a G-Work prompt generator injecting G-Work memories (static files in `src/lib/gwork/memory/` and `agent_memories` table) and G-Work context.
    - For `finance`, keep current call to `generateFinancialResponse`.
  - **Compaction**: Modify the compaction function to update either `ai_memory` or `ai_memory_work` in the `profiles` table according to the session's active module.

### 3.2. Routes `src/app/api/ai/sessions/route.ts` & `[id]/route.ts` (Session Management)
- **Current Behavior**:
  - `GET /api/ai/sessions` lists all user chat sessions ordered by `updated_at DESC`.
  - `POST /api/ai/sessions` creates a session with title.
  - `GET /api/ai/sessions/[id]` loads messages; `DELETE /api/ai/sessions/[id]` deletes a session.
- **Proposed Changes for Separation**:
  - List sessions by filtering on the `module` query parameter:
    ```typescript
    // GET /api/ai/sessions?module=work
    const { searchParams } = new URL(req.url);
    const module = searchParams.get('module') || 'finance';
    
    const { data } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at, chat_messages!inner(id)')
      .eq('user_id', user.id)
      .eq('module', module)
      .order('updated_at', { ascending: false });
    ```
  - Create sessions preserving the `module` parameter in POST request payload:
    ```typescript
    // POST /api/ai/sessions
    const { title, module = 'finance' } = await req.json();
    const { data } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title, module })
      .select()
      .single();
    ```

---

## 4. UI Component Analysis

### 4.1. `src/components/GeminiFab.tsx`
- **Current Behavior**:
  - Uses `usePathname()` to hide the FAB when visiting `/auth`.
  - Renders a fixed header "CFO Assistant" in green themes.
  - Passes no module props to `<AiChatHub isFloating={true} />`.
- **Proposed Changes for Separation**:
  - Determine the active assistant module dynamically based on the current pathname:
    - If `pathname.startsWith('/tasks')`, set `module = 'work'` (CPO Assistant).
    - Else, set `module = 'finance'` (CFO Assistant).
  - Apply custom themes based on the active module:
    - **CFO Theme**: Emerald/green colors, glowing green pulses.
    - **CPO Theme**: Sky/blue/indigo colors, indigo/blue glow pulses.
  - Pass the determined `module` as a prop to `<AiChatHub module={module} />`.

### 4.2. `src/app/components/AiChatHub.tsx`
- **Current Behavior**:
  - Suggestions, headers, placeholders, and thinking spinners are hardcoded to financial data ("Qual é o meu saldo?", "analisando contas...").
  - API calls to sessions and chats are not parameterized.
- **Proposed Changes for Separation**:
  - Accept `module` prop (`'finance' | 'work'`).
  - Parameterize API calls (e.g. `/api/ai/sessions?module=${module}`).
  - Render contextual templates and static UI copies:
    - **CFO Content**:
      - Title: "Gemini Brain / Active" | "Analista Pessoal e Predictor"
      - Suggestions: "Qual o meu saldo?", "Resuma meus gastos", "Metas de investimento"
      - Input Placeholder: "Pergunte sobre seus saldos ou gastos..."
      - Thinking state: "Gemini Brain está analisando suas contas..."
    - **CPO Content**:
      - Title: "CPO Assistant / Active" | "Gerente Tático e Organizador"
      - Suggestions: "Quais tarefas pendentes?", "Resuma os áudios gravados", "Mostre meus projetos", "Identifique novos insights"
      - Input Placeholder: "Pergunte sobre seus projetos ou tarefas..."
      - Thinking state: "CPO Assistant está analisando o G-Work..."
  - Dynamically style CSS border/accent classes based on the `module` prop (e.g. `border-emerald-500/20` vs `border-sky-500/20`, text colors, focus rings).

---

## 5. E2E Testing Design

A comprehensive testing plan using **Playwright** is required to guarantee strict database and UI isolation between the two assistants.

### 5.1. Testing Stack & Structure
We suggest the following structure under the root folder:
```
tests/
├── e2e/
│   ├── chat-isolation.spec.ts   # Tests session database/listing isolation
│   ├── memory-isolation.spec.ts # Tests separate ai_memory and ai_memory_work
│   ├── context-leak.spec.ts     # Tests context database scope isolation
│   └── dynamic-fab.spec.ts      # Tests FAB theme, copies and pathname detection
└── mocks/
    ├── supabase-client.ts       # Database interception/mocking if needed
    └── gemini-api.ts            # Mocks LLM responses for deterministic behavior
```

### 5.2. Test Scenarios Outline

#### Scenario 1: Chat Session Listing Isolation
- **Goal**: Confirm that G-Work conversations are hidden in the G-Finance assistant UI and vice versa.
- **Steps**:
  1. Authenticate user via mock session.
  2. Access G-Work dashboard `/tasks`. Click the FAB, verify theme is Blue/Sky, and create a session titled "Epic Refactoring Discussion".
  3. Navigate to G-Finance dashboard `/finance`. Click the FAB, open the history dropdown, and verify that "Epic Refactoring Discussion" is NOT listed.
  4. Create a G-Finance session titled "June Income Audit".
  5. Return to `/tasks`, click the FAB, open history, and verify that "June Income Audit" is NOT listed.

#### Scenario 2: Memory Compaction & Isolation
- **Goal**: Confirm memory updates affect only the active module's database column.
- **Steps**:
  1. Seed database with initial memories: `ai_memory = 'Guilherme wants to save 20%'`, `ai_memory_work = 'Guilherme uses Tailwind CSS'`.
  2. Mock Gemini compaction endpoint to return a consolidated memory string.
  3. Send `/compact` in a CPO chat session.
  4. Query the database (or mock database response) to verify that `profiles.ai_memory_work` was updated with the consolidated string, while `profiles.ai_memory` remains exactly `'Guilherme wants to save 20%'`.
  5. Repeat under G-Finance chat session, verifying `profiles.ai_memory` changes while `profiles.ai_memory_work` remains untouched.

#### Scenario 3: Context Leak Prevention
- **Goal**: Verify that the CFO Assistant cannot read task data, and the CPO Assistant cannot read transaction data.
- **Steps**:
  1. Seed a secret transaction "Buy Bitcoin 5000" and a secret task "Implement JWT auth".
  2. Under CPO chat session, ask "Quais transações eu fiz?". Verify that the model responds indicating it has no access to financial records (due to system prompt and lack of financial data tools).
  3. Under CFO chat session, ask "Quais são minhas tarefas?". Verify that the model responds indicating it has no access to work tasks.

#### Scenario 4: Pathname & Theme Adaptive UI
- **Goal**: Verify UI matches pathname constraints.
- **Steps**:
  1. Load page `/auth`. Verify that the FAB element `.fixed.bottom-6` is `null` / not visible.
  2. Load page `/finance`. Verify FAB exists. Click FAB. Check that the panel contains text "CFO Assistant" and has green classes (e.g. `text-emerald-400`).
  3. Load page `/tasks`. Click FAB. Check that the panel contains text "CPO Assistant" (or work details) and has blue classes (e.g. `text-sky-400`).
