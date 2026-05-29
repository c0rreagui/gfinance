# MEMORY.md — G-Hub Neural State

## Active Goals
- Maintain the unified G-Hub command center with premium 3D Glassmorphic visuals.
- Support G-Finance (wealth tracker) and G-Work (Kanban, Gemini Task Parser and transcription history).
- Ensure strict database security with RLS policies and audit checks.

## Current State
- [x] Initialized Git repository and pushed to `c0rreagui/gfinance` origin.
- [x] Scaffolding of Next.js 14/15/16 App Router skeleton with TypeScript and Tailwind CSS.
- [x] Installed production dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, `antd`, `@ant-design/icons`).
- [x] Disabled Next.js devIndicators overlay.
- [x] Developed robust Supabase database schema for Tasks, Projects, and Transcriptions with RLS.
- [x] Ported premium 3D Tilt Cards portal at `/` and routed modules to `/finance` and `/tasks`.
- [x] Successfully completed G-Hub rebranding (naming structures, package.json, layouts, sidebars, headers, cards).

## Architecture Decisions
- **Root Repository Level**: Next.js workspace at the repository root to simplify serverless hosting builds.
- **Unified Branding (G-Hub)**: Consolidated G-Finance and G-Work under a cohesive, premium glassmorphism ecosystem.
- **SSR Hydration Safe Guards**: Restricted browser attribute access (like `window.location.search`) to client-side safe hooks (`useEffect`) to avoid pre-rendering crashes.
