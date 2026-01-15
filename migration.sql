-- Migration script to add new columns to existing tables
-- Run this in your Supabase SQL Editor

-- 1. Update crm_leads table
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS segment text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS revenue numeric;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS pain text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS next_action_date timestamp with time zone;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS loss_reason text;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS service_interest text;

-- 2. Update tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'GENERAL';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS related_client_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_rule text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_end timestamp with time zone;

-- 3. Verify RLS (Optional, usually already enabled)
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
