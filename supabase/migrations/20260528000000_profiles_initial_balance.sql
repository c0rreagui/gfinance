-- Migration: 20260528000000_profiles_initial_balance.sql
-- Description: Add initial_balance to profiles for starting offset tracking

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS initial_balance numeric NOT NULL DEFAULT 0.00;
