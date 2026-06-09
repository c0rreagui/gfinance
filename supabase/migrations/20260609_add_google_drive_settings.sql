-- Migration: 20260609_add_google_drive_settings.sql
-- Description: Add Google Drive folder monitoring columns to profiles table

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_folder_name TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_last_sync_at TIMESTAMP WITH TIME ZONE;
