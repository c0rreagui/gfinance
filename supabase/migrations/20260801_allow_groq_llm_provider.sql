-- Migration: 20260801_allow_groq_llm_provider.sql
-- Description: Update profiles_llm_provider_check constraint to support Groq provider

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_llm_provider_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_llm_provider_check
  CHECK (llm_provider IN ('gemini', 'ollama', 'groq', 'openai', 'custom'));
