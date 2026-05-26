-- Migration: 20260527000000_transactions_dedup.sql
-- Description: Add source_hash for deduplication and performance indexes

-- 1. Coluna source_hash para deduplicação idempotente de imports
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source_hash TEXT;

-- 2. Índice único composto: um mesmo hash não pode existir duas vezes para o mesmo usuário
--    Permite INSERT ... ON CONFLICT (user_id, source_hash) DO NOTHING
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_source_hash
  ON public.transactions (user_id, source_hash)
  WHERE source_hash IS NOT NULL;

-- 3. Índice de performance para queries de listagem (user_id + date DESC é o padrão)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON public.transactions (user_id, date DESC);

-- 4. Coluna source_type para rastrear origem da transação
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source_type TEXT
  CHECK (source_type IN ('manual', 'pdf', 'ofx', 'csv', 'sms', 'api'))
  DEFAULT 'manual';

-- 5. Atualizar itau_sync_logs com mais campos para o novo fluxo de arquivos
ALTER TABLE public.itau_sync_logs
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS records_total INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS records_duplicate INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS records_error INT DEFAULT 0;
