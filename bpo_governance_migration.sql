-- MIGRATION: BPO Governance (Token Import & Safe Leave)
-- Run this in Supabase SQL Editor

-- 1. RPC: Join Company via Token
-- Allows a BPO/Consultant to join a company if they possess the valid API Token (Secret)
CREATE OR REPLACE FUNCTION public.join_company_via_token(_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_company_name text;
BEGIN
  -- Validate input
  IF _token IS NULL OR length(trim(_token)) < 10 THEN
    RETURN json_build_object('success', false, 'message', 'Token inválido ou muito curto.');
  END IF;

  -- Find Company by Token
  SELECT id, name INTO v_company_id, v_company_name
  FROM public.companies
  WHERE api_token = _token
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Empresa não encontrada para este token.');
  END IF;

  -- Check if already member
  IF EXISTS (SELECT 1 FROM public.company_members WHERE company_id = v_company_id AND user_id = auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Você já é membro desta empresa.');
  END IF;

  -- Add Member (Role: CONSULTANT by default for token imports, or BPO)
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, auth.uid(), 'CONSULTANT');

  RETURN json_build_object('success', true, 'message', 'Vínculo realizado com sucesso!', 'company_name', v_company_name);
END;
$$;


-- 2. RPC: Leave Company (Safe Exit)
-- Allows a member to leave IF there are other admins and a plan is active
CREATE OR REPLACE FUNCTION public.leave_company(_company_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count int;
  v_has_plan boolean;
  v_company_name text;
BEGIN
  -- Get Company Info
  SELECT name, plan != 'FREE' INTO v_company_name, v_has_plan -- Assuming 'FREE' is no plan, or check specific logic
  FROM public.companies
  WHERE id = _company_id;

  -- Condition 1: Plan Active (Mock logic: Assuming 'FREE' is basic/no-contract, strictly enforcing Paid plan for BPO exit might be too hard? 
  -- Spec said: "A empresa deve ter pelo menos um plano contratado ativo". 
  -- Let's check if 'plan' column is NOT NULL and NOT 'expired'. 
  -- For now, we allow if it exists. If strict check needed: `v_has_plan := true;` for MVP).
  -- Updating logic per spec: "Se não existir plano... não remover".
  -- Let's assume 'FREE' is NOT a contracted plan.
  v_has_plan := (SELECT plan FROM public.companies WHERE id = _company_id) IN ('PREMIUM', 'ENTERPRISE', 'BASIC'); 
  
  -- Override for MVP: Allow leaving if it's just a test. 
  -- But strictly following spec:
  IF v_has_plan IS FALSE THEN
     -- Allow leaving FREE plans IF there is another admin? 
     -- Spec says: "Se não existir plano contratado... não remover". 
     -- Okay, strict.
     RETURN json_build_object('success', false, 'message', 'A empresa precisa ter um plano contratado para ser desvinculada.');
  END IF;

  -- Condition 2: Other Admins
  SELECT count(*) INTO v_admin_count
  FROM public.company_members
  WHERE company_id = _company_id 
  AND role IN ('OWNER', 'ADMIN')
  AND user_id != auth.uid(); -- Exclude self

  IF v_admin_count < 1 THEN
     RETURN json_build_object('success', false, 'message', 'Não é possível sair. A empresa precisa de pelo menos outro Administrador.');
  END IF;

  -- Remove Self
  DELETE FROM public.company_members
  WHERE company_id = _company_id
  AND user_id = auth.uid();

  RETURN json_build_object('success', true, 'message', 'Vínculo removido com sucesso.');
END;
$$;
