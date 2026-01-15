-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Users)
-- Links to Supabase Auth via reference to auth.users
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  role text default 'EMPLOYEE',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

-- Policies for Profiles
-- Users can view their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 2. COMPANIES
create table public.companies (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  cnpj text,
  plan text default 'FREE', -- FREE, PREMIUM, ENTERPRISE
  active boolean default true,
  phone text,
  address text,
  primary_color text default 'indigo',
  logo text,
  api_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Companies
alter table public.companies enable row level security;

-- 3. COMPANY MEMBERS (Many-to-Many link between Users and Companies)
create table public.company_members (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'EMPLOYEE', -- Role specific to this company context if needed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(company_id, user_id)
);

-- Enable RLS for Company Members
alter table public.company_members enable row level security;

-- POLICIES FOR COMPANIES & MEMBERS

-- Policy: Users can see companies they are members of
create policy "Users can view companies they belong to" on public.companies
  for select using (
    exists (
      select 1 from public.company_members
      where company_id = public.companies.id
      and user_id = auth.uid()
    )
  );
  
-- Policy: BPO/Consultants/Admins can create companies
-- (For simplicity, allowing authenticated users to create companies for now)
create policy "Authenticated users can create companies" on public.companies
  for insert with check (auth.role() = 'authenticated');

-- Trigger to automatically add creator as Admin of the company
create or replace function public.handle_new_company()
returns trigger as $$
begin
  insert into public.company_members (company_id, user_id, role)
  values (new.id, auth.uid(), 'ADMIN');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_company_created
  after insert on public.companies
  for each row execute procedure public.handle_new_company();

-- Policy: Members can view member lists of their companies
create policy "Members can view other members of their companies" on public.company_members
  for select using (
    exists (
      select 1 from public.company_members as cm
      where cm.company_id = public.company_members.company_id
      and cm.user_id = auth.uid()
    )
  );

-- TRIGGER: Handle New User (Sync Auth to Profile)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name',
    coalesce(new.raw_user_meta_data->>'role', 'ADMIN') -- Default to Admin for first user or fallback
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
