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

-- 4. Initial Seed Function / Trigger to insert sample projects and mock transcriptions for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_tasks_setup()
RETURNS trigger AS $$
DECLARE
    gfinance_project_id UUID;
    synapse_project_id UUID;
    personal_project_id UUID;
BEGIN
    -- 1. Insert default projects
    INSERT INTO public.tasks_projects (user_id, name, description, color)
    VALUES (new.id, 'G-Finance Core', 'Wealth command center development, Open Finance sync and security', 'emerald')
    RETURNING id INTO gfinance_project_id;

    INSERT INTO public.tasks_projects (user_id, name, description, color)
    VALUES (new.id, 'Synapse Platform', 'Massive social media profile automation and rendering engine', 'blue')
    RETURNING id INTO synapse_project_id;

    INSERT INTO public.tasks_projects (user_id, name, description, color)
    VALUES (new.id, 'Personal Life', 'Investments, sports, reading lists, life logistics', 'indigo')
    RETURNING id INTO personal_project_id;

    -- 2. Insert default tasks
    INSERT INTO public.tasks (user_id, project_id, title, description, status, priority, due_date)
    VALUES (
        new.id, 
        gfinance_project_id, 
        'Reconciliação inicial do saldo Itaú', 
        'Depurar discrepâncias de saldo e testar hash de deduplicação no parser de extrato PDF.', 
        'todo', 
        'high', 
        now() + interval '1 day'
    );

    INSERT INTO public.tasks (user_id, project_id, title, description, status, priority, due_date)
    VALUES (
        new.id, 
        synapse_project_id, 
        'Implementar switch toggles e polling 10s', 
        'Substituir botões por toggles no painel Neo do clipper e garantir atualização via polling constante.', 
        'in_progress', 
        'medium', 
        now() + interval '3 days'
    );

    INSERT INTO public.tasks (user_id, project_id, title, description, status, priority, due_date)
    VALUES (
        new.id, 
        personal_project_id, 
        'Rebalanceamento de ativos da carteira', 
        'Ajustar percentuais de renda fixa e criptoativos conforme planejamento financeiro.', 
        'completed', 
        'low', 
        now() - interval '2 days'
    );

    -- 3. Insert default mock transcriptions
    INSERT INTO public.transcriptions (user_id, project_id, file_name, content, transcribed_at)
    VALUES (
        new.id,
        gfinance_project_id,
        'audio_memo_reconciliacao_itau.txt',
        'Guilherme, precisamos ajustar a reconciliação do saldo inicial do banco Itaú na API. Verifique se o hash de deduplicação está funcionando e crie uma tarefa de prioridade alta para depurar o extrato bancário até amanhã à noite.',
        now() - interval '1 hour'
    );

    INSERT INTO public.transcriptions (user_id, project_id, file_name, content, transcribed_at)
    VALUES (
        new.id,
        synapse_project_id,
        'briefing_synapse_dashboard.txt',
        'Ideias para o design system Neo: focar em switch toggles em vez de botões e manter o polling de status de 10 segundos. Adicionar isso como tarefa de prioridade média no projeto Synapse.',
        now() - interval '1 day'
    );

    INSERT INTO public.transcriptions (user_id, project_id, file_name, content, transcribed_at)
    VALUES (
        new.id,
        NULL,
        'nota_mental_criptoativos.txt',
        'Lembrete importante de finanças pessoais: analisar o rebalanceamento estratégico de Ethereum e Sol para o final de semana. Prioridade baixa, mas essencial para manter o target da carteira.',
        now() - interval '3 days'
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up trigger
CREATE OR REPLACE TRIGGER on_auth_user_created_tasks
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_tasks_setup();

-- Apply retroactively to existing users in public.profiles
DO $$
DECLARE
    profile_record RECORD;
    gfinance_project_id UUID;
    synapse_project_id UUID;
    personal_project_id UUID;
BEGIN
    FOR profile_record IN SELECT id FROM public.profiles LOOP
        -- Only if they do not have tasks setup already
        IF NOT EXISTS (SELECT 1 FROM public.tasks_projects WHERE user_id = profile_record.id) THEN
            -- 1. Insert default projects
            INSERT INTO public.tasks_projects (user_id, name, description, color)
            VALUES (profile_record.id, 'G-Finance Core', 'Wealth command center development, Open Finance sync and security', 'emerald')
            RETURNING id INTO gfinance_project_id;

            INSERT INTO public.tasks_projects (user_id, name, description, color)
            VALUES (profile_record.id, 'Synapse Platform', 'Massive social media profile automation and rendering engine', 'blue')
            RETURNING id INTO synapse_project_id;

            INSERT INTO public.tasks_projects (user_id, name, description, color)
            VALUES (profile_record.id, 'Personal Life', 'Investments, sports, reading lists, life logistics', 'indigo')
            RETURNING id INTO personal_project_id;

            -- 2. Insert default tasks
            INSERT INTO public.tasks (user_id, project_id, title, description, status, priority, due_date)
            VALUES (
                profile_record.id, 
                gfinance_project_id, 
                'Reconciliação inicial do saldo Itaú', 
                'Depurar discrepâncias de saldo e testar hash de deduplicação no parser de extrato PDF.', 
                'todo', 
                'high', 
                now() + interval '1 day'
            );

            INSERT INTO public.tasks (user_id, project_id, title, description, status, priority, due_date)
            VALUES (
                profile_record.id, 
                synapse_project_id, 
                'Implementar switch toggles e polling 10s', 
                'Substituir botões por toggles no painel Neo do clipper e garantir atualização via polling constante.', 
                'in_progress', 
                'medium', 
                now() + interval '3 days'
            );

            INSERT INTO public.tasks (user_id, project_id, title, description, status, priority, due_date)
            VALUES (
                profile_record.id, 
                personal_project_id, 
                'Rebalanceamento de ativos da carteira', 
                'Ajustar percentuais de renda fixa e criptoativos conforme planejamento financeiro.', 
                'completed', 
                'low', 
                now() - interval '2 days'
            );

            -- 3. Insert default mock transcriptions
            INSERT INTO public.transcriptions (user_id, project_id, file_name, content, transcribed_at)
            VALUES (
                profile_record.id,
                gfinance_project_id,
                'audio_memo_reconciliacao_itau.txt',
                'Guilherme, precisamos ajustar a reconciliação do saldo inicial do banco Itaú na API. Verifique se o hash de deduplicação está funcionando e crie uma tarefa de prioridade alta para depurar o extrato bancário até amanhã à noite.',
                now() - interval '1 hour'
            );

            INSERT INTO public.transcriptions (user_id, project_id, file_name, content, transcribed_at)
            VALUES (
                profile_record.id,
                synapse_project_id,
                'briefing_synapse_dashboard.txt',
                'Ideias para o design system Neo: focar em switch toggles em vez de botões e manter o polling de status de 10 segundos. Adicionar isso como tarefa de prioridade média no projeto Synapse.',
                now() - interval '1 day'
            );

            INSERT INTO public.transcriptions (user_id, project_id, file_name, content, transcribed_at)
            VALUES (
                profile_record.id,
                NULL,
                'nota_mental_criptoativos.txt',
                'Lembrete importante de finanças pessoais: analisar o rebalanceamento estratégico de Ethereum e Sol para o final de semana. Prioridade baixa, mas essencial para manter o target da carteira.',
                now() - interval '3 days'
            );
        END IF;
    END LOOP;
END;
$$;
