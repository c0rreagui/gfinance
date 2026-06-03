-- Migration: Add physical_last_four and card_brand to public.credit_cards
-- These columns may already exist in remote databases, but we add them IF NOT EXISTS here for consistency and local reproduction.

ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS physical_last_four text;

ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS card_brand text DEFAULT 'mastercard';
