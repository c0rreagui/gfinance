-- Migration: 20260529120000_tasks_and_transcriptions.sql
-- Description: Create projects, tasks and transcriptions tables with strict RLS policies

-- 1. Tasks Projects Table
CREATE TABLE IF NOT EXISTS public.tasks_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'emerald' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tasks_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios projetos de tarefas" ON public.tasks_projects;
CREATE POLICY "Usuários podem gerenciar seus próprios projetos de tarefas"
    ON public.tasks_projects
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.tasks_projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'completed')) DEFAULT 'todo' NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium' NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias tarefas" ON public.tasks;
CREATE POLICY "Usuários podem gerenciar suas próprias tarefas"
    ON public.tasks
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks (project_id);

-- 3. Transcriptions Table (cached audio transcription files from Drive)
CREATE TABLE IF NOT EXISTS public.transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    google_drive_file_id TEXT,
    content TEXT NOT NULL,
    transcribed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    project_id UUID REFERENCES public.tasks_projects(id) ON DELETE SET NULL,
    ai_summary TEXT,
    ai_insights TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias transcrições" ON public.transcriptions;
CREATE POLICY "Usuários podem gerenciar suas próprias transcrições"
    ON public.transcriptions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes for transcriptions
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_date ON public.transcriptions (user_id, transcribed_at DESC);

-- 4. Seeding function, trigger and retroactive loop removed to clean up mock data from G-Work module.
