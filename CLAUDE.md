# CLAUDE.md — G-Hub Guidelines

## Project Context
G-Hub is a state-of-the-art integrated command center. It unifies:
1. **G-Finance**: A premium wealth and portfolio management platform.
2. **G-Work**: A task and AI-assisted work manager connected with audio transcriptions.

The application features an immersive 3D Glassmorphic interface, premium 3D Tilt Cards, mesh gradient layers, and deep AI integrations.

## Technology Stack
- **Frontend**: Next.js 14+ (App Router, TypeScript, React 19)
- **Styling**: Tailwind CSS v4, custom glassmorphism layers, OKLch color system
- **Backend/Database**: Supabase (PostgreSQL with strict Row-Level Security)
- **Icons**: Lucide React

## Development Commands
- **Start Development Server**: `npm run dev`
- **Build Production App**: `npm run build`
- **Verify Lint Rules**: `npm run lint`
- **Postgres Migrations Audit**: `./scripts/audit-rls.sh` (validates strict RLS policy rules)

## Strict Architecture Conventions
1. **Row-Level Security (RLS)**: No table exists in the `public` schema without enabling RLS and having policies bound to `auth.uid() = user_id`.
2. **Design Tokens**: Standardize colors using OKLch variables. Never use arbitrary inline styling or plain Tailwind colors where curated palette tokens should be used.
3. **TypeScript**: Strict type definitions required for all transaction amounts and schema-backed entities.
4. **Strict Ecosystem Boundaries (G-Finance ↔ G-Work)**:
   - Under no circumstances should code under G-Work (`src/app/tasks`) import or reference files from G-Finance modules (`src/app/finance`, `src/app/transactions`, `src/app/cards`, `src/app/debts`, `src/app/subscriptions`, `src/app/wealth`, `src/app/analytics`, `src/app/crypto`, `src/app/integrations`).
   - G-Finance modules must never import from `src/app/tasks`.
   - This boundary is strictly enforced at compile time via ESLint `no-restricted-imports`. Do not bypass, modify, or disable this rule.
   - Database migrations for G-Work must not read, write, update, or drop tables, constraints, functions, or triggers belonging to G-Finance.
   - Run `npm run lint` and `npm run build` after any modifications to verify boundaries remain unbroken.
