-- Migration: 20260619_cos_and_calendar.sql
-- Description: Add ai_memory_hub to profiles and create calendar_events table

-- 1. Add ai_memory_hub to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS ai_memory_hub TEXT DEFAULT '';

-- 2. Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  color TEXT NOT NULL DEFAULT '#6366f1', -- Indigo default
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('work', 'personal', 'finance', 'general')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Users can manage their own calendar events" ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at_calendar_events()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_calendar_events_timestamp
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_calendar_events();
