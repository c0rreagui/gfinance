-- Migration: Add available_limit to credit_cards
-- Path: supabase/migrations/20260608010000_add_available_limit_to_cards.sql

ALTER TABLE public.credit_cards
ADD COLUMN IF NOT EXISTS available_limit numeric;
