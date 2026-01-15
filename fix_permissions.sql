-- FIX: Company Creation and Visibility Issues
-- Run this script in your Supabase SQL Editor

-- 1. Add created_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'created_by') THEN
        ALTER TABLE public.companies ADD COLUMN created_by uuid REFERENCES auth.users DEFAULT auth.uid();
    END IF;
END $$;

-- 2. Ensure RLS is enabled and clear old policies to prevent conflicts
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view companies they belong to" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;

-- 3. Create Robust Policies

-- SELECT: Allow if the user created the company OR is a member
CREATE POLICY "Users can view companies" ON public.companies
    FOR SELECT USING (
        auth.uid() = created_by 
        OR 
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_id = public.companies.id 
            AND user_id = auth.uid()
        )
    );

-- INSERT: Authenticated users can create companies
CREATE POLICY "Authenticated users can create companies" ON public.companies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Creator or Members can update
CREATE POLICY "Users can update companies" ON public.companies
    FOR UPDATE USING (
        auth.uid() = created_by 
        OR 
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_id = public.companies.id 
            AND user_id = auth.uid()
        )
    );

-- DELETE: Creator or Members can delete
CREATE POLICY "Users can delete companies" ON public.companies
    FOR DELETE USING (
        auth.uid() = created_by 
        OR 
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_id = public.companies.id 
            AND user_id = auth.uid()
        )
    );

-- 4. Ensure Profiles RLS doesn't block joins
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Ensure users can always view/insert their OWN profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. Fix Trigger Permissions
-- Ensure the function runs as Security Definer to bypass RLS when adding the member
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Attempt to insert member, ignore conflicts
  BEGIN
    INSERT INTO public.company_members (company_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'ADMIN');
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors (e.g. duplicate key or profile missing), 
    -- as proper access is now handled by created_by column as fallback
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
