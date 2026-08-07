# Analysis — Separation of G-Work (CPO) and G-Finance (CFO) Assistants

## 1. Executive Summary
This document provides a detailed technical analysis of G-Hub's codebase to decouple and isolate the **CPO Assistant** (G-Work) and **CFO Assistant** (G-Finance).
The system currently treats all conversational AI interactions as finance-centric, using a single `profiles.ai_memory` column for long-term memory and querying finance tables globally.
To achieve clean separation, we propose:
1. **Schema Separation**: Segmenting chat sessions via a `module` column (`'finance' | 'work'`) in `chat_sessions` and introducing `profiles.ai_memory_work` for work-related perennial memories.
2. **API Specialization**: Parameterizing session management (`/api/ai/sessions`) and chat completions (`/api/ai/chat`) to toggle contexts, system prompts, active memories, and database fields dynamically.
3. **Adaptive UI**: Altering `GeminiFab.tsx` and `AiChatHub.tsx` to detect the route path, customize themes, present relevant quick-suggestion templates, and parameterize requests.
4. **E2E Testing Framework**: Introducing a Playwright-based testing suite to assert session isolation, verify separate memory compactions, guarantee no cross-module context leaks, and test path-based frontend adaptive styling.

---

## 2. Database Schema Analysis

### 2.1. Chat Session Metadata & Messages
- **Definition File**: `supabase/migrations/20260601000000_chat_sessions_and_memory.sql`
- **Current Structure**:
  - `chat_sessions`: Contains `id` (UUID, primary key), `user_id` (UUID, references `auth.users`), `title` (text, default `'Nova Conversa'`), `created_at`, and `updated_at`.
  - `chat_messages`: Contains `id`, `session_id` (references `chat_sessions`), `user_id`, `role` (`'user'` or `'model'`), `content` (text), `is_compacted` (boolean, default `false`), and `created_at`.
- **Proposed Migration**:
  We need to add a `module` text column to `chat_sessions` to partition session histories. Existing records should default to `'finance'`. A check constraint will prevent invalid modules.
  ```sql
  -- Add module column with constraint
  ALTER TABLE public.chat_sessions 
    ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'finance' 
    CONSTRAINT chat_sessions_module_check CHECK (module IN ('finance', 'work'));

  -- Create a compound index for fast queries when filtering sessions by module
  CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_module_updated 
    ON public.chat_sessions(user_id, module, updated_at DESC);
  ```

### 2.2. User Perennial Memory (`profiles`)
- **Definition File**: `supabase/migrations/20260525000000_init_schema.sql` (creation) and `20260601000000_chat_sessions_and_memory.sql` (column `ai_memory` addition).
- **Current Structure**:
  - `profiles`: Contains `id` (references `auth.users`), `full_name`, `avatar_url`, `pin`, `initial_balance`, and `ai_memory` (text, default `''`).
- **Proposed Migration**:
  Add `ai_memory_work` to store long-term context derived from G-Work tasks, transcriptions, and meeting notes, isolating it from G-Finance's `ai_memory`.
  ```sql
  ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS ai_memory_work TEXT DEFAULT '';
  ```

### 2.3. G-Work Context Tables
The CPO assistant will draw context from the following tables, defined in G-Work migrations:
1. **`tasks`** (`supabase/migrations/20260529120000_tasks_and_transcriptions.sql` & `20260609_gwork_hierarchy_and_insights.sql`):
   Contains hierarchical task structures (epics, features, stories, tasks) linked via `parent_id` and `project_id`. Includes status (`backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled`) and priority (`critical`, `high`, `medium`, `low`, `none`).
2. **`tasks_projects`**: Defines projects with colors, names, and descriptions.
3. **`transcriptions`**: Stores transcribed audio contents sync'd from Google Drive, AI summary drafts, and parsed entities.
4. **`ai_insights`**: Stores system alerts (deadline warnings, pattern changes) related to specific tasks or transcriptions.
5. **`agent_memories`** (`supabase/migrations/20260609_create_agent_memories.sql`):
   Stores dynamic rules and user preferences extracted from transcriptions that dictate how the agent should structure epic breakdowns or status shifts.

---

## 3. API & Backend Analysis

### 3.1. Route Handler: `src/app/api/ai/sessions/route.ts` & `[id]/route.ts`
- **Current Code**:
  Fetches all user sessions and handles basic creations.
- **Modifications Required**:
  - **GET**: Support filtering by `module` via query parameters. If no parameter is passed, default to `'finance'` (or filter none for backwards compatibility).
    ```typescript
    // In GET handler (src/app/api/ai/sessions/route.ts)
    const { searchParams } = new URL(req.url);
    const module = searchParams.get('module') || 'finance';
    
    // Filter by module
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('module', module)
      .order('updated_at', { ascending: false });
    ```
  - **POST**: Read `module` from the request body (defaulting to `'finance'`) and include it in the insertion.
    ```typescript
    // In POST handler (src/app/api/ai/sessions/route.ts)
    const { title, module = 'finance' } = await req.json();
    const { data: sessionData, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: title || 'Nova Conversa',
        module
      })
      .select()
      .single();
    ```

### 3.2. Route Handler: `src/app/api/ai/chat/route.ts`
- **Current Code**:
  Reads the user query, reads global `ai_memory` from `profiles`, extracts a large financial context block (saldos, transações, etc.), calls `generateFinancialResponse` (in `src/lib/gemini.ts`), writes the response, and calls `compactSessionHistory` (in `src/lib/memory.ts`) when the history grows too long.
- **Modifications Required**:
  1. **Receive Module Parameter**: Check if a `module` parameter is passed in the request body (`{ message, sessionId, module }`).
     - If `sessionId` is provided, fetch its `module` from the database to ensure integrity.
     - If it's a new session, use the provided `module` (default to `'finance'`).
  2. **Select Perennial Memory Field**:
     - If `module === 'work'`, query `profiles(ai_memory_work)` instead of `profiles(ai_memory)`.
  3. **Isolate AI Execution & Tool Registrations**:
     - **Finance Module (CFO)**:
       - Keep current flow. Queries financial tables and registers financial tools (`create_user_transaction`, `list_user_transactions`, etc.). Calls `generateFinancialResponse`.
     - **Work Module (CPO)**:
       - Do **not** query financial tables. This prevents leakage and lowers token overhead.
       - Query G-Work tables (`tasks`, `tasks_projects`, `transcriptions`, `ai_insights`, and active `agent_memories`).
       - Register work-oriented tool declarations. For instance, we can expose tools to query projects, tasks, update task statuses, list transcription summaries, or add dynamic memories.
       - Formulate a CPO-specific system prompt (focused on software project management, Linear/Stripe style guidelines, agile estimation, task breakdown).
       - Call a new generator function `generateWorkResponse(...)` inside `src/lib/gemini.ts` or route logic.
  4. **Compaction Routing**:
     - Pass the active `module` to `compactSessionHistory` so it updates the correct column (`profiles.ai_memory` or `profiles.ai_memory_work`) and uses the appropriate compaction system prompt (finance-oriented vs project/work-oriented).

### 3.3. Memory Helper: `src/lib/memory.ts`
- **Current Code**:
  `compactSessionHistory` reads active messages, feeds them to Gemini, gets a summarized bullet list of learnings, and writes it back to `profiles.ai_memory`.
- **Modifications Required**:
  Update `compactSessionHistory` signature to receive `module: 'finance' | 'work'`:
  ```typescript
  export async function compactSessionHistory(
    supabaseClient: any,
    userId: string,
    sessionId: string,
    module: 'finance' | 'work' = 'finance'
  )
  ```
  - Inside the function, select the memory field and the system prompt dynamically:
    - **Finance Prompt**: Focused on user financial goals, budget habits, accounts, and card notes. Updates `profiles.ai_memory`.
    - **Work Prompt**: Focused on Guilherme's engineering guidelines, stack preferences (e.g. Next.js, Postgres, Tailwind, dark-first UI), product decisions, timelines, and meeting priorities. Updates `profiles.ai_memory_work`.

---

## 4. Frontend Component Analysis

### 4.1. `src/components/GeminiFab.tsx`
- **Current Code**:
  Hides the floating action button on `/auth`. Renders a green button that opens `<AiChatHub />`.
- **Modifications Required**:
  1. Determine the module from `usePathname()`:
     ```typescript
     const pathname = usePathname();
     const module = pathname?.startsWith('/tasks') ? 'work' : 'finance';
     ```
  2. Implement visual styling adaptations:
     - **Finance**: Green accents (`bg-emerald-500`, shadow emerald pulses, `text-emerald-400`).
     - **Work**: Blue/Indigo accents (`bg-indigo-500` or `bg-sky-500`, shadow indigo pulses, `text-sky-400`).
  3. Pass `module` down to the drawer:
     ```tsx
     <AiChatHub isFloating={true} module={module} isOpen={isOpen} onClose={toggleOpen} />
     ```

### 4.2. `src/app/components/AiChatHub.tsx`
- **Current Code**:
  Displays a chat pane with hardcoded financial suggestions and fetches chat data from `/api/ai/sessions` and `/api/ai/chat` without module filtering.
- **Modifications Required**:
  1. Accept `module: 'finance' | 'work'` as a prop.
  2. Filter session fetch queries: `/api/ai/sessions?module=${module}`.
  3. Send `module` in message payload: `fetch('/api/ai/chat', { body: JSON.stringify({ message, sessionId, module }) })`.
  4. Dynamically adjust copies and placeholders:
     - **Finance Header**: "Gemini Brain / Analista Pessoal e Predictor".
     - **Finance Placeholder**: "Pergunte sobre seus saldos ou gastos...".
     - **Finance Suggestions**:
       - `"Qual é o meu saldo total?"`
       - `"Resuma meus gastos recentes"`
       - `"Como atingir minhas metas?"`
     - **Work Header**: "G-Work Engine / CPO Virtual e Estrategista".
     - **Work Placeholder**: "Pergunte sobre seus projetos ou tarefas...".
     - **Work Suggestions**:
       - `"Quais são minhas tarefas críticas?"`
       - `"Resuma minhas últimas gravações"`
       - `"Como está o progresso do Kanban?"`
  5. Apply class styling dynamically based on the module (e.g. toggle focus borders and thinking bubble accents between `focus-within:ring-emerald-500/20` and `focus-within:ring-indigo-500/20`).

---

## 5. Comprehensive E2E Testing Framework Design

A high-quality E2E testing framework is essential to verify strict separation between CPO and CFO. Playwright is chosen as the test engine because:
1. **Next.js & Supabase Native Integration**: Playwright executes directly in headless chrome instances, hitting actual frontend routes, triggering client APIs, and updating real or local Docker-based Supabase instances.
2. **Context Interception**: Allows intercepting outgoing requests (like Gemini API calls) to ensure deterministic results.
3. **Database Seeding and RLS Validation**: Tests can log in as a test user, seed specific database tables, and assert that querying through client API or dashboard interfaces shows only the correct entries.

### 5.1. Directory Structure Proposal
```
tests/
├── e2e/
│   ├── chat-sessions-isolation.spec.ts   # Checks that chat list and messages are segmented
│   ├── perennial-memory-isolation.spec.ts # Checks that compaction only modifies the target column
│   ├── context-leak-prevention.spec.ts   # Checks CPO cannot access cashflow, and CFO cannot access tasks
│   └── adaptive-fab.spec.ts              # Checks path-based styles, copies, suggestions and hiding
└── helpers/
    ├── db-seeder.ts                      # Inserts test users, sessions, transactions, and tasks
    └── mock-llm-server.ts                # Intercepts Gemini API fetch calls and provides mock outputs
```

### 5.2. Detailed E2E Test Specifications (Playwright Mockups)

#### A. Chat Sessions Isolation Spec (`chat-sessions-isolation.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';
import { seedTestUser, seedChatSessions } from '../helpers/db-seeder';

test.describe('CPO and CFO Chat Sessions Isolation', () => {
  let userToken: string;

  test.beforeAll(async () => {
    // 1. Create temporary test user and seed sessions in both modules
    const { token, userId } = await seedTestUser();
    userToken = token;
    
    await seedChatSessions(userId, [
      { title: 'Auditoria de Gasto Semanal', module: 'finance' },
      { title: 'Feature Kanban Epic Breakdown', module: 'work' }
    ]);
  });

  test('CFO assistant displays only finance sessions', async ({ page }) => {
    // Log in user mock and navigate to finance
    await page.goto('/finance');
    // Open chat hub drawer
    await page.click('[data-testid="gemini-fab"]');
    await page.click('[data-testid="history-dropdown"]');
    
    // Assert finance session is present
    await expect(page.locator('text=Auditoria de Gasto Semanal')).toBeVisible();
    // Assert work session is hidden
    await expect(page.locator('text=Feature Kanban Epic Breakdown')).not.toBeVisible();
  });

  test('CPO assistant displays only work sessions', async ({ page }) => {
    await page.goto('/tasks');
    await page.click('[data-testid="gemini-fab"]');
    await page.click('[data-testid="history-dropdown"]');
    
    // Assert work session is present
    await expect(page.locator('text=Feature Kanban Epic Breakdown')).toBeVisible();
    // Assert finance session is hidden
    await expect(page.locator('text=Auditoria de Gasto Semanal')).not.toBeVisible();
  });
});
```

#### B. Perennial Memory Isolation Spec (`perennial-memory-isolation.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';
import { seedTestUser, fetchUserProfile } from '../helpers/db-seeder';

test.describe('Perennial Memory Isolation & Compaction', () => {
  test('Compacting work chat updates profiles.ai_memory_work without touching profiles.ai_memory', async ({ page }) => {
    const { userId } = await seedTestUser({
      ai_memory: 'G-Finance: Guardar 10% em reserva.',
      ai_memory_work: 'G-Work: Stack inicial e Next.js.'
    });

    // Intercept Gemini API completion during compaction to verify payload and simulate response
    await page.route('**/api/ai/chat', async (route) => {
      const json = route.request().postDataJSON();
      if (json.message === '/compact') {
        // Return simulated compacted list
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            compacted: true,
            response: 'Memória atualizada para Next.js e Tailwind CSS.'
          })
        });
      }
      return route.continue();
    });

    await page.goto('/tasks');
    await page.click('[data-testid="gemini-fab"]');
    
    // Send /compact command to force compaction flow
    await page.fill('[data-testid="chat-input"]', '/compact');
    await page.click('[data-testid="chat-send-btn"]');
    
    // Wait for AI thinking states
    await expect(page.locator('text=Memória atualizada')).toBeVisible();

    // Verify DB states directly via database hook
    const updatedProfile = await fetchUserProfile(userId);
    expect(updatedProfile.ai_memory_work).toContain('Next.js');
    expect(updatedProfile.ai_memory).toBe('G-Finance: Guardar 10% em reserva.'); // Untouched
  });
});
```

#### C. Context Leak Prevention Spec (`context-leak-prevention.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';
import { seedTestUser, seedPrivateTransactions, seedPrivateTasks } from '../helpers/db-seeder';

test.describe('Context Leak Prevention & Data Isolation', () => {
  test.beforeAll(async () => {
    const { userId } = await seedTestUser();
    await seedPrivateTransactions(userId, [
      { description: 'Supermercado Oculto R$ 1500', amount: -1500 }
    ]);
    await seedPrivateTasks(userId, [
      { title: 'Refatorar Roteamento de Autenticação Segura', status: 'todo' }
    ]);
  });

  test('CFO Assistant cannot access task databases', async ({ page }) => {
    await page.goto('/finance');
    await page.click('[data-testid="gemini-fab"]');
    
    await page.fill('[data-testid="chat-input"]', 'Quais tarefas de autenticação eu tenho pendentes?');
    await page.click('[data-testid="chat-send-btn"]');

    // The model response should indicate inability to check tasks or have no task names in text
    const responseText = await page.locator('[data-testid="ai-message-bubble"]').last().textContent();
    expect(responseText).not.toContain('Refatorar Roteamento');
  });

  test('CPO Assistant cannot access transactional databases', async ({ page }) => {
    await page.goto('/tasks');
    await page.click('[data-testid="gemini-fab"]');
    
    await page.fill('[data-testid="chat-input"]', 'Quanto gastei no Supermercado Oculto?');
    await page.click('[data-testid="chat-send-btn"]');

    const responseText = await page.locator('[data-testid="ai-message-bubble"]').last().textContent();
    expect(responseText).not.toContain('1500');
    expect(responseText).not.toContain('Supermercado Oculto');
  });
});
```

#### D. Adaptive FAB & Pathname UI Spec (`adaptive-fab.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Adaptive UI Theming and Path Detection', () => {
  test('GeminiFab is hidden on auth views', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('[data-testid="gemini-fab"]')).toBeHidden();
  });

  test('GeminiFab applies green theme and CFO copies on finance routing', async ({ page }) => {
    await page.goto('/finance');
    const fab = page.locator('[data-testid="gemini-fab"]');
    await expect(fab).toBeVisible();
    await expect(fab).toHaveClass(/bg-emerald/); // Expect emerald theme class

    await fab.click();
    // Assert CFO copies
    await expect(page.locator('text=Gemini Brain')).toBeVisible();
    await expect(page.locator('text=Analista Pessoal e Predictor')).toBeVisible();
    await expect(page.locator('placeholder="Pergunte sobre seus saldos ou gastos..."')).toBeVisible();
  });

  test('GeminiFab applies blue theme and CPO copies on tasks routing', async ({ page }) => {
    await page.goto('/tasks');
    const fab = page.locator('[data-testid="gemini-fab"]');
    await expect(fab).toBeVisible();
    await expect(fab).toHaveClass(/bg-indigo|bg-sky/); // Expect indigo or sky theme class

    await fab.click();
    // Assert CPO copies
    await expect(page.locator('text=G-Work Engine')).toBeVisible();
    await expect(page.locator('text=CPO Virtual e Estrategista')).toBeVisible();
    await expect(page.locator('placeholder="Pergunte sobre seus projetos ou tarefas..."')).toBeVisible();
  });
});
```

---

## 6. Implementation Action Plan & Recommendations

For the implementing agent, we recommend executing the changes in the following sequence:

1. **Step 1: Database Migration**: Run the SQL commands to add `chat_sessions.module` check constraint and `profiles.ai_memory_work` column. Ensure default values are handled correctly for pre-existing records.
2. **Step 2: API Handler Separation**:
   - Update `src/app/api/ai/sessions/route.ts` to accept and filter using `module` parameter.
   - Update `src/app/api/ai/chat/route.ts` to query either `profiles.ai_memory` or `profiles.ai_memory_work`.
3. **Step 3: AI Brain Context Decoupling**:
   - Write a helper to assemble G-Work context and separate system prompts for the CPO assistant.
   - Register the compaction task correctly targeting the respective database column.
4. **Step 4: Adaptive FAB & Chat UI Integration**:
   - Hook pathname detection to set the module value.
   - Bind module prop to the `AiChatHub` component, customize themes, placeholders, and suggestion templates.
5. **Step 5: Testing Verification**:
   - Add Playwright dependency, configure the test runner, and implement the test specifications outlined in Section 5. Run tests locally and assert success.
