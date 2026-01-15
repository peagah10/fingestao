-- RPC Function to securely join a company via token
-- Performs lookup and insertion server-side to bypass RLS restrictions safely.

CREATE OR REPLACE FUNCTION public.join_company_via_token(_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_company_name text;
  v_user_id uuid;
  v_exists boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Usuário não autenticado.');
  END IF;

  -- 1. Find Company
  SELECT id, name INTO v_company_id, v_company_name
  FROM public.companies
  WHERE api_token = _token
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Token inválido ou empresa não encontrada.');
  END IF;

  -- 2. Check if already member
  SELECT EXISTS(
    SELECT 1 FROM public.company_members
    WHERE company_id = v_company_id AND user_id = v_user_id
  ) INTO v_exists;

  IF v_exists THEN
    RETURN json_build_object('success', false, 'message', 'Você já possui acesso a esta empresa.');
  END IF;

  -- 3. Insert Member
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'ADMIN');

  RETURN json_build_object('success', true, 'message', 'Empresa ' || v_company_name || ' importada com sucesso!');
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_company_via_token(text) TO authenticated;
