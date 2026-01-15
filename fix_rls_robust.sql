-- ROBUST FIX: Add created_by column to ensure visibility immediately after creation

-- 1. Add created_by column
-- Use a safe block to avoid error if it already exists
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'companies' and column_name = 'created_by') then
        alter table public.companies add column created_by uuid references auth.users default auth.uid();
    end if;
end $$;

-- 2. Update Helper Function (Keep it security definer)
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

-- 3. Update Companies Policies to allow Creator access
alter table public.companies enable row level security;

-- Drop constraints to reset
drop policy if exists "Users can view companies they belong to" on public.companies;
drop policy if exists "Authenticated users can create companies" on public.companies;
drop policy if exists "Users can update companies they belong to" on public.companies;
drop policy if exists "Users can delete companies they belong to" on public.companies;

-- SELECT: Allow if Member OR Creator
create policy "Users can view companies" on public.companies
  for select using (
    auth.uid() = created_by 
    or public.is_member_of(id)
  );

-- INSERT: Authenticated users can create
create policy "Authenticated users can create companies" on public.companies
  for insert with check (auth.role() = 'authenticated');

-- UPDATE: Allow if Member OR Creator
create policy "Users can update companies" on public.companies
  for update using (
    auth.uid() = created_by 
    or public.is_member_of(id)
  );

-- DELETE: Allow if Member OR Creator
create policy "Users can delete companies" on public.companies
  for delete using (
    auth.uid() = created_by 
    or public.is_member_of(id)
  );

-- 4. Clean up infinite recursion on members just in case
drop policy if exists "Members can view other members of their companies" on public.company_members;
create policy "Members can view other members of their companies" on public.company_members
  for select using (
    public.is_member_of(company_id)
  );
