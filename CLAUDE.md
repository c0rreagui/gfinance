# CLAUDE.md — G-Finance Guidelines

## Project Context
G-Finance is a state-of-the-art personal and corporate wealth management platform. It features an immersive 3D Glassmorphism interface, premium 3D Tilt Cards, mesh gradient layers, and real-time bank account syncing.

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
