-- Migration: 20260619_google_calendar_id.sql
-- Description: Add google_event_id to calendar_events table

ALTER TABLE public.calendar_events 
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Create unique index to prevent duplicate syncs of the same Google event for a user
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_user_google_event_idx 
  ON public.calendar_events (user_id, google_event_id) 
  WHERE google_event_id IS NOT NULL;
