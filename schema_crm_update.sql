-- Add Service Interest and Source to Leads
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS service_interest text, -- 'CONSULTING', 'BPO', 'BOTH'
ADD COLUMN IF NOT EXISTS source text; -- 'REFERRAL', 'ADS', 'COLD_CALL', etc.

-- Add Service Type to Companies (Clients)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS service_type text; -- 'CONSULTING', 'BPO', 'BOTH'

-- Update RLS if necessary (usually existing policies cover new columns if they are on the table)
-- But ensuring we can write to them
GRANT UPDATE (service_interest, source) ON public.crm_leads TO authenticated;
GRANT UPDATE (service_type) ON public.companies TO authenticated;
