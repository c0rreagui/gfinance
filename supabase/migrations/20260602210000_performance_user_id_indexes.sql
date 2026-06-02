-- Migration: Performance User ID Indexes
-- Path: supabase/migrations/20260602210000_performance_user_id_indexes.sql
-- Optimizes query planning under RLS constraints for financial core tables

-- 1. Balances Table
CREATE INDEX IF NOT EXISTS idx_balances_user ON public.balances (user_id);

-- 2. Reminders Table
CREATE INDEX IF NOT EXISTS idx_reminders_user_paid ON public.reminders (user_id, paid) WHERE paid = false;
CREATE INDEX IF NOT EXISTS idx_reminders_user_date ON public.reminders (user_id, due_date DESC);

-- 3. Goals Table
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals (user_id);

-- 4. Credit Cards Table
CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON public.credit_cards (user_id);

-- 5. Crypto Wallets Table
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user ON public.crypto_wallets (user_id);
