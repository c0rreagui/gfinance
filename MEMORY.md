# MEMORY.md — G-Finance Neural State

## Active Goals
- Port the premium HTML 3D prototype into a fully functional Next.js App Router workspace.
- Implement secure Supabase Database schema with rigorous RLS policies.
- Connect frontend routes dynamically to Supabase Auth & real-time updates.

## Current State
- [x] Initialized Git repository and pushed to `c0rreagui/gfinance` origin.
- [x] Scaffolding of Next.js 14 App Router skeleton with TypeScript and Tailwind CSS.
- [x] Installed production dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`).
- [x] Disabled Next.js devIndicators overlay.
- [/] Ready to design Supabase migrations and implement RLS audit tools.

## Architecture Decisions
- **Root Repository Level**: Decided to place the Next.js workspace directly at the repository root folder rather than a nested subdirectory. This simplifies Vercel serverless builds and deployment triggers.
- **Git Clean Purge**: Used git clean to successfully purge temporary and misrouted dependency structures from the PowerShell recursive copy operation.
