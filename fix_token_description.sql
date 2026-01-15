-- Add Description Column for API Token
-- Run this in the Supabase SQL Editor

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='api_token_description') THEN
        ALTER TABLE public.companies ADD COLUMN api_token_description text;
    END IF;
END
$$;
