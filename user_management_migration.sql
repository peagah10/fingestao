-- MIGRATION: User Management RPCs
-- Run this in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Company Invites Table (Pending Invites)
CREATE TABLE IF NOT EXISTS public.company_invites (
    id uuid default uuid_generate_v4() primary key,
    company_id uuid references public.companies(id) on delete cascade not null,
    email text not null,
    role text default 'EMPLOYEE',
    token text default uuid_generate_v4()::text, -- Simple token for link
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(company_id, email)
);

-- RLS for Invites
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view invites" ON public.company_invites;
CREATE POLICY "Admins can view invites" ON public.company_invites
    FOR SELECT
    USING (
        exists (
            select 1 from public.company_members
            where company_id = public.company_invites.company_id
            and user_id = auth.uid()
            and role in ('OWNER', 'ADMIN', 'BPO')
        )
    );

DROP POLICY IF EXISTS "Admins can create invites" ON public.company_invites;
CREATE POLICY "Admins can create invites" ON public.company_invites
    FOR INSERT
    WITH CHECK (
        exists (
            select 1 from public.company_members
            where company_id = public.company_invites.company_id
            and user_id = auth.uid()
            and role in ('OWNER', 'ADMIN', 'BPO')
        )
    );

DROP POLICY IF EXISTS "Admins can delete invites" ON public.company_invites;
CREATE POLICY "Admins can delete invites" ON public.company_invites
    FOR DELETE
    USING (
        exists (
            select 1 from public.company_members
            where company_id = public.company_invites.company_id
            and user_id = auth.uid()
            and role in ('OWNER', 'ADMIN', 'BPO')
        )
    );

-- 1. Invite User to Company (By Email) - Modified to handle New Users
CREATE OR REPLACE FUNCTION public.invite_user_to_company(_email text, _company_id uuid, _role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invite_token text;
BEGIN
  -- Validate Role
  IF _role NOT IN ('OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'BPO', 'CONSULTANT', 'VIEWER') THEN
    RETURN json_build_object('success', false, 'message', 'Papel inválido.');
  END IF;

  -- 1. Try to find existing User ID
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE email = _email;

  IF v_user_id IS NULL THEN
     SELECT id INTO v_user_id
     FROM auth.users
     WHERE email = _email;
  END IF;

  -- 2. IF USER EXISTS: Add directly
  IF v_user_id IS NOT NULL THEN
      -- Check if already member
      IF EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company_id AND user_id = v_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'Usuário já é membro da empresa.');
      END IF;

      INSERT INTO public.company_members (company_id, user_id, role)
      VALUES (_company_id, v_user_id, _role);

      RETURN json_build_object('success', true, 'message', 'Usuário existente adicionado com sucesso!');
  END IF;

  -- 3. IF USER DOES NOT EXIST: Create Pending Invite
  -- Check if invite already exists
  IF EXISTS (SELECT 1 FROM public.company_invites WHERE company_id = _company_id AND email = _email) THEN
      RETURN json_build_object('success', false, 'message', 'Já existe um convite pendente para este email.');
  END IF;

  v_invite_token := uuid_generate_v4()::text;

  INSERT INTO public.company_invites (company_id, email, role, token)
  VALUES (_company_id, _email, _role, v_invite_token);

  RETURN json_build_object(
      'success', true, 
      'message', 'Convite criado! Envie o link para o usuário.',
      'invite_token', v_invite_token,
      'is_new_user', true
  );
END;
$$;

-- 2. Remove User from Company (Safe Remove)
-- Prevents removing the last OWNER/ADMIN
CREATE OR REPLACE FUNCTION public.remove_user_from_company(_target_user_id uuid, _company_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count int;
  v_target_role text;
BEGIN
  -- Get Target Role
  SELECT role INTO v_target_role
  FROM public.company_members
  WHERE company_id = _company_id AND user_id = _target_user_id;

  IF v_target_role IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Usuário não é membro.');
  END IF;

  -- If target is ADMIN or OWNER, check if there are others
  IF v_target_role IN ('OWNER', 'ADMIN') THEN
      SELECT count(*) INTO v_admin_count
      FROM public.company_members
      WHERE company_id = _company_id 
      AND role IN ('OWNER', 'ADMIN')
      AND user_id != _target_user_id;

      IF v_admin_count < 1 THEN
         RETURN json_build_object('success', false, 'message', 'Não é possível remover o último Administrador/Dono.');
      END IF;
  END IF;

  -- Remove
  DELETE FROM public.company_members
  WHERE company_id = _company_id AND user_id = _target_user_id;

  RETURN json_build_object('success', true, 'message', 'Usuário removido com sucesso.');
END;
$$;

-- 3. Update User Role
-- Prevents downgrading the last ADMIN
CREATE OR REPLACE FUNCTION public.update_user_role(_target_user_id uuid, _company_id uuid, _new_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count int;
  v_current_role text;
BEGIN
  -- Validate New Role
  IF _new_role NOT IN ('OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'BPO', 'CONSULTANT', 'VIEWER') THEN
    RETURN json_build_object('success', false, 'message', 'Papel inválido.');
  END IF;

  -- Get Current Role
  SELECT role INTO v_current_role
  FROM public.company_members
  WHERE company_id = _company_id AND user_id = _target_user_id;

  -- Check if downgrading (Was Admin/Owner -> Now something else)
  IF v_current_role IN ('OWNER', 'ADMIN') AND _new_role NOT IN ('OWNER', 'ADMIN') THEN
      SELECT count(*) INTO v_admin_count
      FROM public.company_members
      WHERE company_id = _company_id 
      AND role IN ('OWNER', 'ADMIN')
      AND user_id != _target_user_id;

      IF v_admin_count < 1 THEN
         RETURN json_build_object('success', false, 'message', 'Não é possível alterar o papel do último Administrador.');
      END IF;
  END IF;

  -- Update
  UPDATE public.company_members
  SET role = _new_role
  WHERE company_id = _company_id AND user_id = _target_user_id;

  RETURN json_build_object('success', true, 'message', 'Papel atualizado com sucesso.');
END;
$$;

-- 4. Cancel Invite
CREATE OR REPLACE FUNCTION public.cancel_invite(_invite_id uuid, _company_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.company_invites 
    WHERE id = _invite_id AND company_id = _company_id;
    
    RETURN json_build_object('success', true, 'message', 'Convite cancelado.');
END;
$$;
