








create extension if not exists supabase_vault with schema vault;






create or replace function public.set_secret(p_name text, p_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id     uuid;
  v_key_id uuid;
begin
  select id, key_id into v_id, v_key_id
  from vault.secrets
  where name = p_name
  limit 1;

  if v_id is not null then
    -- update_secret(secret_id, new_secret, new_name, new_description, new_key_id)
    -- Pass the original key_id explicitly so the encryption key is preserved.
    -- NULL description keeps the existing description.
    perform vault.update_secret(v_id, p_value, p_name, null, v_key_id);
  else
    -- create_secret(new_secret, new_name, new_description, new_key_id)
    perform vault.create_secret(p_value, p_name);
  end if;
end;
$$;





create or replace function public.get_secret(p_name text)
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = p_name
  limit 1;
$$;








create or replace function public.is_configured()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select count(*) = 3
  from vault.secrets
  where name in ('openai_api_key', 'github_token', 'github_repo');
$$;







create or replace function public.delete_secret(p_name text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from vault.secrets where name = p_name;
$$;





revoke execute on function public.set_secret(text, text) from public, anon, authenticated;
revoke execute on function public.get_secret(text) from public, anon, authenticated;
revoke execute on function public.is_configured() from public, anon, authenticated;
revoke execute on function public.delete_secret(text) from public, anon, authenticated;

grant execute on function public.set_secret(text, text) to service_role;
grant execute on function public.get_secret(text) to service_role;
grant execute on function public.is_configured() to service_role;
grant execute on function public.delete_secret(text) to service_role;




create table if not exists public.settings (
  key   text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;





grant all on table public.settings to service_role;
