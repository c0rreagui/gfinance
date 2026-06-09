-- Migration: 20260609_remove_gwork_mocks.sql
-- Description: Drop new user mock seeding trigger/function and clean up existing mock tasks, projects, and transcriptions.

-- 1. Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created_tasks ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_tasks_setup();

-- 2. Delete mock transcriptions
DELETE FROM public.transcriptions 
WHERE file_name IN (
    'audio_memo_reconciliacao_itau.txt', 
    'briefing_synapse_dashboard.txt', 
    'nota_mental_criptoativos.txt'
);

-- 3. Delete mock tasks
DELETE FROM public.tasks 
WHERE title IN (
    'Reconciliação inicial do saldo Itaú', 
    'Implementar switch toggles e polling 10s', 
    'Rebalanceamento de ativos da carteira'
);

-- 4. Delete mock projects
DELETE FROM public.tasks_projects 
WHERE name IN (
    'G-Finance Core', 
    'Synapse Platform', 
    'Personal Life'
);
