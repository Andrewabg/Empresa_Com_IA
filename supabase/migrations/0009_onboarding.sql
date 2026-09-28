


create or replace function public.is_born()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.settings where key = 'company_born' and value = 'true'
  );
$$;

revoke execute on function public.is_born() from public, anon, authenticated;
grant execute on function public.is_born() to service_role;
