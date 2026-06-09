-- Create agent_memories table
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL DEFAULT 'rule', -- 'fact', 'rule', 'preference'
  content TEXT NOT NULL,
  source_transcription_id UUID REFERENCES public.transcriptions(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Allow authenticated users complete ownership of their agent memories" ON public.agent_memories
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at_agent_memories()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_agent_memories_timestamp
  BEFORE UPDATE ON public.agent_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_agent_memories();
