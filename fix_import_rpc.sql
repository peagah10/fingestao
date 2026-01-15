-- RPC Function to allow secure lookup of company by token
-- Bypasses RLS (Security Definer) but only returns minimal info if token matches exactly.

create or replace function public.get_company_by_token(_token text)
returns table (id uuid, name text) 
language plpgsql 
security definer 
as $$
begin
  return query
  select c.id, c.name
  from public.companies c
  where c.api_token = _token
  limit 1;
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.get_company_by_token(text) to authenticated;
