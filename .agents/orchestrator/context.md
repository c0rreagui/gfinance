# Context Information - CPO & CFO Assistant Separation

## Known Files & Locations
- **Context Profile**: `src/lib/gwork/memory/contexto.md`
- **Chat API**: `src/app/api/ai/chat/route.ts`
- **Sessions API**: `src/app/api/ai/sessions/route.ts`
- **Chat Hub Component**: `src/app/components/AiChatHub.tsx`
- **Gemini FAB Component**: `src/components/GeminiFab.tsx`
- **Gemini Engine / Client**: `src/lib/gemini.ts`
- **Memory Logic**: `src/lib/memory.ts`
- **Database Migrations**: `supabase/migrations/`

## Constraints & Objectives
- G-Work/CPO Assistant must be themed **Blue** under `/tasks` routes.
- CFO Assistant must be themed **Emerald** under other routes.
- Sessions and memory must be strictly isolated: G-Work CPO Assistant must filter on `module = 'work'` and use `profiles.ai_memory_work`. CFO Assistant must filter on `module = 'finance'` and use `profiles.ai_memory`.
- CPO Assistant must have database tools to manage tasks, projects, transcriptions, and insights.
- The CPO Assistant must not access financial data (balances, transactions, targets), and CFO Assistant must not access tasks, projects, transcriptions.
- Avoid hardcoding results or bypassing security.
