-- Migration: 20260609_gwork_hierarchy_and_insights.sql
-- Description: G-Work foundation — task hierarchy, AI metadata, insights engine
-- Evolves tasks into hierarchical work items (Epic → Feature → Story → Task),
-- adds AI processing metadata to transcriptions, creates ai_insights table.

-- =============================================================================
-- 1. ALTER tasks TABLE — hierarchy, AI metadata, timestamps
-- =============================================================================

-- 1a. Work item type (hierarchy level)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'task';

-- Drop existing check constraint if it exists, then add the new one
DO $$ BEGIN
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_check
    CHECK (type IN ('epic', 'feature', 'story', 'task'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1b. Hierarchy: parent reference for tree structure
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- 1c. Sort ordering within siblings
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 1d. AI provenance
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS ai_confidence REAL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source_transcription_id UUID REFERENCES public.transcriptions(id) ON DELETE SET NULL;

-- 1e. Lifecycle timestamps
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1f. Drop old status constraint first, update rows, then add new constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

UPDATE public.tasks SET status = 'done' WHERE status = 'completed';

ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'));

-- 1g. Expand priority enum — drop old constraint, add new one
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('critical', 'high', 'medium', 'low', 'none'));

-- 1h. Backfill existing rows
UPDATE public.tasks SET type = 'task' WHERE type IS NULL;
UPDATE public.tasks SET updated_at = created_at WHERE updated_at IS NULL;

-- 1i. Performance indexes for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type_status ON public.tasks(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_tasks_sort ON public.tasks(user_id, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_source_transcription ON public.tasks(source_transcription_id);

-- =============================================================================
-- 2. ALTER transcriptions TABLE — processing metadata
-- =============================================================================

ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS extracted_entities JSONB;

ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS gemini_model TEXT;

ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS token_count INTEGER;

-- =============================================================================
-- 3. CREATE ai_insights TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (
    insight_type IN ('action_suggestion', 'deadline_warning', 'pattern_detected', 'priority_shift')
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (
    severity IN ('info', 'warning', 'critical')
  ),
  related_work_items UUID[],
  related_transcriptions UUID[],
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  acted_on BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index: only active (non-dismissed, non-acted-on) insights per user
CREATE INDEX IF NOT EXISTS idx_insights_user_active
  ON public.ai_insights(user_id, created_at DESC)
  WHERE dismissed = FALSE AND acted_on = FALSE;

-- =============================================================================
-- 4. RLS — ai_insights (per Supabase best practices)
-- =============================================================================

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- SELECT: users can only read their own insights
CREATE POLICY "Users own insights select"
  ON public.ai_insights FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- INSERT: users can only insert insights for themselves
CREATE POLICY "Users own insights insert"
  ON public.ai_insights FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- UPDATE: users can only update their own insights (both USING and WITH CHECK)
CREATE POLICY "Users own insights update"
  ON public.ai_insights FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- DELETE: users can only delete their own insights
CREATE POLICY "Users own insights delete"
  ON public.ai_insights FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
