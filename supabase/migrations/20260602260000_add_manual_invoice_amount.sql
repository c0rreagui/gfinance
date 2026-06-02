-- Migration: Add Manual Invoice Amount column to Credit Cards
-- Path: supabase/migrations/20260602260000_add_manual_invoice_amount.sql

ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS manual_invoice_amount numeric DEFAULT NULL;
