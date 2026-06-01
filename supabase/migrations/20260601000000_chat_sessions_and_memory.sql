-- Migration: 20260601000000_chat_sessions_and_memory.sql
-- Description: Create persistent chat sessions, chat messages, and profiles.ai_memory per user.

-- 1. Adicionar coluna de memória AI no perfil do usuário
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS ai_memory TEXT DEFAULT '';

-- 2. Tabela de sessões de chat
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Nova Conversa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chat_sessions
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias sessões" ON public.chat_sessions;
CREATE POLICY "Usuários podem gerenciar suas próprias sessões"
    ON public.chat_sessions FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Tabela de mensagens de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    is_compacted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chat_messages
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias mensagens" ON public.chat_messages;
CREATE POLICY "Usuários podem gerenciar suas próprias mensagens"
    ON public.chat_messages FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Índices para performance otimizada
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id, updated_at DESC);
