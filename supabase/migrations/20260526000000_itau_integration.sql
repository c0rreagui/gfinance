-- Migration: 20260526000000_itau_integration.sql
-- Description: Create tables for secure Itaú Banking-as-a-Service (BaaS) and Open Finance integrations

-- 1. Table for secure connection tokens per user
CREATE TABLE IF NOT EXISTS public.itau_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    client_secret_encrypted BYTEA,
    agency TEXT NOT NULL,
    account_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_user_itau UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.itau_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias conexões Itaú" ON public.itau_connections;
CREATE POLICY "Usuários podem gerenciar suas próprias conexões Itaú"
    ON public.itau_connections
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Table for audit and sync histories logs
CREATE TABLE IF NOT EXISTS public.itau_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    records_synced INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.itau_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios logs Itaú" ON public.itau_sync_logs;
CREATE POLICY "Usuários podem ver apenas seus próprios logs Itaú"
    ON public.itau_sync_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
