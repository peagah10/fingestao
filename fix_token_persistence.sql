-- Fix API Token Persistence
-- Run this in the Supabase SQL Editor

-- 1. Ensure column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='api_token') THEN
        ALTER TABLE public.companies ADD COLUMN api_token text;
    END IF;
END
$$;

-- 2. Ensure RLS Policy allows UPDATE
-- Drop existing update policy to be safe and recreate it
DROP POLICY IF EXISTS "Users can update companies they belong to" ON public.companies;

CREATE POLICY "Users can update companies they belong to" ON public.companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_id = public.companies.id
      AND user_id = auth.uid()
    )
  );

-- 3. Grant access to authenticated users (just in case)
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.company_members TO authenticated;
