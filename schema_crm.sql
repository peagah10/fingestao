-- 8. CRM FUNNELS (Stages)
-- Helps organize leads. Default stages: New, Qualified, Negotiation, Won, Lost
create table public.crm_funnel_stages (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  "order" integer not null default 0,
  color text,
  is_system_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.crm_funnel_stages enable row level security;

-- 9. CRM LEADS
create table public.crm_leads (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  company_name text, -- Name of the lead's company
  status text not null, -- Links to funnel stage ID or name? Mock uses Status enum. Let's use text for flexibility or stage_id.
  -- To start simple and match mock: 'NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'
  source text,
  value numeric default 0,
  notes text,
  assigned_to uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  segment text,
  revenue numeric, -- Estimated revenue
  pain text, -- Pain points or main problem
  next_action text, -- Required next step
  next_action_date timestamp with time zone,
  loss_reason text, -- Reason for lost deal
  service_interest text -- CONSULTING, BPO, BOTH
);
alter table public.crm_leads enable row level security;

-- 10. TASKS
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  title text not null,
  description text,
  due_date timestamp with time zone,
  priority text default 'MEDIUM', -- LOW, MEDIUM, HIGH
  status text default 'PENDING', -- PENDING, IN_PROGRESS, DONE
  assigned_to uuid references auth.users(id),
  related_lead_id uuid references public.crm_leads(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  task_type text default 'GENERAL', -- 'CRM', 'BPO', 'GENERAL'
  related_client_id uuid references public.companies(id) on delete set null, -- For BPO/Client tasks
  recurrence_rule text, -- e.g. 'MONTHLY', 'WEEKLY'
  recurrence_end timestamp with time zone
);
alter table public.tasks enable row level security;

-- RLS POLICIES

-- Funnel Stages
create policy "Users can view funnel stages of their companies" on public.crm_funnel_stages
  for select using (
    exists (select 1 from public.company_members where company_id = public.crm_funnel_stages.company_id and user_id = auth.uid())
  );
create policy "Users can manage funnel stages of their companies" on public.crm_funnel_stages
  for all using (
    exists (select 1 from public.company_members where company_id = public.crm_funnel_stages.company_id and user_id = auth.uid())
  );

-- Leads
create policy "Users can view leads of their companies" on public.crm_leads
  for select using (
    exists (select 1 from public.company_members where company_id = public.crm_leads.company_id and user_id = auth.uid())
  );
create policy "Users can manage leads of their companies" on public.crm_leads
  for all using (
    exists (select 1 from public.company_members where company_id = public.crm_leads.company_id and user_id = auth.uid())
  );

-- Tasks
create policy "Users can view tasks of their companies" on public.tasks
  for select using (
    exists (select 1 from public.company_members where company_id = public.tasks.company_id and user_id = auth.uid())
  );
create policy "Users can manage tasks of their companies" on public.tasks
  for all using (
    exists (select 1 from public.company_members where company_id = public.tasks.company_id and user_id = auth.uid())
  );
