-- Migration: 20260609_add_profiles_insert_policy.sql
-- Description: Add INSERT policy to profiles table to allow upsert operations to succeed

CREATE POLICY "Allow users to insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);
