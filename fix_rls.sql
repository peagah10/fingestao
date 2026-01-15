-- Fix Infinite Recursion on RLS

-- 1. Create a secure function to check membership without triggering RLS loops
-- SECURITY DEFINER allows this function to bypass RLS on company_members table
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

-- 2. Update Companies Policy
drop policy if exists "Users can view companies they belong to" on public.companies;
create policy "Users can view companies they belong to" on public.companies
  for select using (
    public.is_member_of(id)
  );

-- 3. Update Company Members Policy
-- To view a member row, you must be a member of that company yourself
drop policy if exists "Members can view other members of their companies" on public.company_members;
create policy "Members can view other members of their companies" on public.company_members
  for select using (
    public.is_member_of(company_id)
  );
  
-- 4. Ensure Insert Policies (Previous Fixes)
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Authenticated users can create companies" on public.companies;
create policy "Authenticated users can create companies" on public.companies
  for insert with check (auth.role() = 'authenticated');

-- 5. Ensure Trigger for Admin Assignment (Make sure it exists)
create or replace function public.handle_new_company()
returns trigger as $$
begin
  insert into public.company_members (company_id, user_id, role)
  values (new.id, auth.uid(), 'ADMIN');
  return new;
end;
$$ language plpgsql security definer;
