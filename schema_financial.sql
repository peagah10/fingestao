-- 4. FINANCIAL ACCOUNTS
create table if not exists public.financial_accounts (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  type text not null, -- BANK, CASH, DIGITAL_WALLET
  balance numeric default 0,
  status text default 'ACTIVE',
  bank_name text,
  agency text,
  account_number text,
  internal_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.financial_accounts enable row level security;

-- 5. FINANCIAL CATEGORIES
create table if not exists public.financial_categories (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  type text not null, -- INCOME, EXPENSE
  color text,
  icon text,
  active boolean default true,
  is_system_default boolean default false,
  linked_account_plan_id text, -- string for now, or could be uuid if account_plans table exists
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.financial_categories enable row level security;

-- 6. COST CENTERS
create table if not exists public.cost_centers (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  code text,
  description text,
  budget numeric default 0,
  period text default 'MONTHLY',
  status text default 'ACTIVE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.cost_centers enable row level security;

-- 7. TRANSACTIONS
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  account_id uuid references public.financial_accounts(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  description text not null,
  amount numeric not null,
  type text not null, -- INCOME, EXPENSE
  category text, -- Stores name or ID? Ideally ID, but current mock seems to use name sometimes. Let's assume ID reference or string. 
  -- Fix: Based on types.ts, 'category' is a string. But strictly it should link to financial_categories.
  -- For now we allow text to support legacy/migrated data, but UI should pick from categories.
  date date not null,
  status text default 'PENDING',
  document_number text,
  observation text,
  created_by uuid references auth.users(id), -- Optional audit
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.transactions enable row level security;

-- RLS POLICIES (Reusable checks)

-- Accounts
drop policy if exists "Users can view accounts of their companies" on public.financial_accounts;
create policy "Users can view accounts of their companies" on public.financial_accounts
  for select using (
    exists (select 1 from public.company_members where company_id = public.financial_accounts.company_id and user_id = auth.uid())
  );
drop policy if exists "Users can manage accounts of their companies" on public.financial_accounts;
create policy "Users can manage accounts of their companies" on public.financial_accounts
  for all using (
    exists (select 1 from public.company_members where company_id = public.financial_accounts.company_id and user_id = auth.uid())
  );

-- Categories
drop policy if exists "Users can view categories of their companies" on public.financial_categories;
create policy "Users can view categories of their companies" on public.financial_categories
  for select using (
    exists (select 1 from public.company_members where company_id = public.financial_categories.company_id and user_id = auth.uid())
  );
drop policy if exists "Users can manage categories of their companies" on public.financial_categories;
create policy "Users can manage categories of their companies" on public.financial_categories
  for all using (
    exists (select 1 from public.company_members where company_id = public.financial_categories.company_id and user_id = auth.uid())
  );

-- Cost Centers
drop policy if exists "Users can view cost centers of their companies" on public.cost_centers;
create policy "Users can view cost centers of their companies" on public.cost_centers
  for select using (
    exists (select 1 from public.company_members where company_id = public.cost_centers.company_id and user_id = auth.uid())
  );
drop policy if exists "Users can manage cost centers of their companies" on public.cost_centers;
create policy "Users can manage cost centers of their companies" on public.cost_centers
  for all using (
    exists (select 1 from public.company_members where company_id = public.cost_centers.company_id and user_id = auth.uid())
  );

-- Transactions
drop policy if exists "Users can view transactions of their companies" on public.transactions;
create policy "Users can view transactions of their companies" on public.transactions
  for select using (
    exists (select 1 from public.company_members where company_id = public.transactions.company_id and user_id = auth.uid())
  );
drop policy if exists "Users can manage transactions of their companies" on public.transactions;
create policy "Users can manage transactions of their companies" on public.transactions
  for all using (
    exists (select 1 from public.company_members where company_id = public.transactions.company_id and user_id = auth.uid())
  );
