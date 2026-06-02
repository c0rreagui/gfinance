-- Migration: Add color_theme column to credit_cards
-- Path: supabase/migrations/20260602240000_credit_card_colors.sql

ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS color_theme text DEFAULT 'emerald';
