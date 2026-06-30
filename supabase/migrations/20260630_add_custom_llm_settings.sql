-- Migration: 20260630_add_custom_llm_settings.sql
-- Description: Add custom LLM customization settings to profiles table

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS llm_provider TEXT DEFAULT 'gemini' NOT NULL,
  ADD COLUMN IF NOT EXISTS llm_api_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS llm_api_key TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT NULL;

-- Add check constraint for llm_provider
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_llm_provider_check
    CHECK (llm_provider IN ('gemini', 'ollama', 'openai', 'custom'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
