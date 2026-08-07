# PROJECT.md — G-Hub CPO & CFO Assistant Separation

## Project Name
**G-Hub CPO & CFO Assistant Separation**

---

## Architecture

This project splits the G-Hub conversational assistant into two separate context-isolated engines:
1. **CFO Assistant (G-Finance)**: Handles financial transactions, balances, goals, reminders, and credit cards. It operates with a green/emerald theme and uses the `ai_memory` text field in the user profile to persist long-term context.
2. **CPO Assistant (G-Work)**: Handles tasks, projects, audio transcriptions, and productivity insights. It operates with a blue/sky theme, uses the `ai_memory_work` text field in the user profile, and has access to database tools for tasks and projects.

The database schemas, API routes, memory compactions, and UI elements are completely isolated to enforce this boundary, preventing context leakage between G-Work and G-Finance.

```
                  ┌──────────────────────────────────────────────────────────┐
                  │                        AiChatHub                         │
                  │              (Dynamic Theme and Context)                 │
                  └────────────────────────────┬─────────────────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
         Route: /tasks (G-Work)                          Other Routes (G-Finance)
         • Mode: CPO Assistant                           • Mode: CFO Assistant
         • Theme: Blue/Sky                               • Theme: Emerald/Green
         • Module: 'work'                                • Module: 'finance'
                       │                                               │
                       ▼                                               ▼
      ┌─────────────────────────────────┐             ┌─────────────────────────────────┐
      │          POST /api/ai           │             │          POST /api/ai           │
      │        (module = 'work')        │             │       (module = 'finance')      │
      └────────────────┬────────────────┘             └────────────────┬────────────────┘
                       │                                               │
                       ▼                                               ▼
        ai_memory_work (profiles)                       ai_memory (profiles)
        chat_sessions (module = 'work')                 chat_sessions (module = 'finance')
```

---

## Milestones

- **Milestone 1: Exploration & Consensus (Complete)**
  - Identify schema boundaries and existing endpoints.
  - Establish consensus on architecture, table additions, and column specifications.

- **Milestone 2: Database Isolation - R1 (In Progress)**
  - Add `module` column to `chat_sessions` (CHECK constraint: `'finance'` or `'work'`, defaulting to `'finance'`).
  - Add `ai_memory_work` column to `profiles` (default `''`).
  - Update `src/lib/memory.ts` compaction mechanism to respect module boundaries.
  - Update `/api/ai/sessions` GET and POST routes.

- **Milestone 3: CPO Core Backend - R2**
  - Implement CPO prompt and `contexto.md` context injection in `/api/ai/chat/route.ts`.
  - Add database tools for tasks, projects, transcriptions, and insights.

- **Milestone 4: Frontend Integration - R3**
  - Integrate route detection using `usePathname()`.
  - Dynamically toggle colors, placeholders, suggestions, and parameter values.

- **Milestone 5: Verification & Audit**
  - Run comprehensive RLS validations and E2E system testing.

---

## Interface Contracts

### 1. Database Schema
- **`chat_sessions` table**:
  - `module` column: `TEXT NOT NULL DEFAULT 'finance' CHECK (module IN ('finance', 'work'))`.
  - Composite Index: `idx_chat_sessions_user_module` on `(user_id, module, updated_at DESC)`.
- **`profiles` table**:
  - `ai_memory_work` column: `TEXT DEFAULT '' NOT NULL`.

### 2. `/api/ai/sessions`
- **GET Request**:
  - Query parameters: `?module=finance` or `?module=work` (default `finance`).
  - Action: Returns active user sessions filtered by the specified module.
  - Response: `{ success: true, sessions: [...] }`.
- **POST Request**:
  - Body: `{ title: string, module: 'finance' | 'work' }`.
  - Action: Creates a new chat session bound to the specified module.
  - Response: `{ success: true, session: { id, title, created_at, updated_at, module } }`.

### 3. Memory Compaction (`src/lib/memory.ts`)
- Signature: `compactSessionHistory(supabaseClient: any, userId: string, sessionId: string, module?: 'finance' | 'work')`.
- Behavior: Compacts recent history to the corresponding profile column (`ai_memory` for `finance` / `ai_memory_work` for `work`).

---

## Code Layout

The core components for this integration are distributed as follows:

```
d:\APPS - ANTIGRAVITY\G-Hub\
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── ai/
│   │   │       ├── chat/
│   │   │       │   └── route.ts       # Chat dispatch and AI responses
│   │   │       └── sessions/
│   │   │           └── route.ts       # Session listings and creation APIs
│   │   └── components/
│   │       └── AiChatHub.tsx          # Main assistant modal and panel UI
│   ├── components/
│   │   └── GeminiFab.tsx              # Floating Action Button entry point
│   └── lib/
│       ├── memory.ts                  # Memory consolidation helper
│       └── gemini.ts                  # AI model integration layer
└── supabase/
    └── migrations/                    # Database migrations
```
