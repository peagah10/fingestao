-- COMPREHENSIVE RLS FIX
-- Run this script to reset and fix all policies related to Company Creation

-- 1. Helper Function (Security Definer to bypass RLS loops)
create or replace function public.is_member_of(_company_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.company_members
    where company_id = _company_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 2. Trigger Function (Security Definer to bypass RLS on insert)
create or replace function public.handle_new_company()
returns trigger as $$
begin
  insert into public.company_members (company_id, user_id, role)
  values (new.id, auth.uid(), 'ADMIN');
  return new;
end;
$$ language plpgsql security definer;

-- 3. Reset Policies on COMPANIES
alter table public.companies enable row level security;

-- Drop all known policies to be safe
drop policy if exists "Users can view companies they belong to" on public.companies;
drop policy if exists "Authenticated users can create companies" on public.companies;
drop policy if exists "Users can update companies they belong to" on public.companies;
drop policy if exists "Users can delete companies they belong to" on public.companies;

-- Recreate Policies
create policy "Users can view companies they belong to" on public.companies
  for select using (public.is_member_of(id));

create policy "Authenticated users can create companies" on public.companies
  for insert with check (auth.role() = 'authenticated');

create policy "Users can update companies they belong to" on public.companies
  for update using (public.is_member_of(id));

create policy "Users can delete companies they belong to" on public.companies
  for delete using (public.is_member_of(id));

-- 4. Reset Policies on COMPANY_MEMBERS
alter table public.company_members enable row level security;

drop policy if exists "Members can view other members of their companies" on public.company_members;

create policy "Members can view other members of their companies" on public.company_members
  for select using (public.is_member_of(company_id));

-- 5. Reset Policies on PROFILES
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 6. Ensure Trigger exists
drop trigger if exists on_company_created on public.companies;
create trigger on_company_created
  after insert on public.companies
  for each row execute procedure public.handle_new_company();
