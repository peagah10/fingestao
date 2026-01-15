-- MIGRATION: Unique CNPJ & Secure Lookup
-- Run this in Supabase SQL Editor

-- 1. Clean up potential duplicates (Optional/Safety Step)
-- DELETE FROM public.companies a USING public.companies b WHERE a.id < b.id AND a.cnpj = b.cnpj;

-- 2. Add Unique Constraint to CNPJ
ALTER TABLE public.companies 
DROP CONSTRAINT IF EXISTS companies_cnpj_key; -- safety drop

ALTER TABLE public.companies 
ADD CONSTRAINT companies_cnpj_key UNIQUE (cnpj);

-- 3. Secure Helper to Check/Get Company by CNPJ
CREATE OR REPLACE FUNCTION public.get_company_by_cnpj(p_cnpj text)
RETURNS TABLE (
  id uuid,
  name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name
  FROM public.companies c
  WHERE c.cnpj = p_cnpj
  LIMIT 1;
END;
$$;

-- 4. Secure RPC to Join a Company
-- Allows an authenticated user to join an existing company
CREATE OR REPLACE FUNCTION public.join_existing_company(company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Essential to bypass RLS on company_members
SET search_path = public
AS $$
BEGIN
  -- Check if already member
  IF EXISTS (SELECT 1 FROM public.company_members WHERE company_id = $1 AND user_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;

  -- Insert as 'ADMIN' (or logic to define role, e.g. 'MEMBER')
  -- Using 'ADMIN' for simplicity as requested "Vinculado ao cadastro existente" implies management access
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES ($1, auth.uid(), 'ADMIN');

  RETURN TRUE;
END;
$$;
