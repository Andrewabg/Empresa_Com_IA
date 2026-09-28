








create table if not exists public.operator_identity (
  singleton  boolean primary key default true,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint operator_identity_is_singleton check (singleton)
);

alter table public.operator_identity enable row level security;
grant all on table public.operator_identity to service_role;




create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.operator_identity oi
    where oi.user_id = (select auth.uid())
  );
$$;
revoke execute on function public.is_operator() from public;
grant execute on function public.is_operator() to authenticated, service_role;


create or replace function public.get_operator_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.operator_identity where singleton limit 1;
$$;
revoke execute on function public.get_operator_id() from public, anon, authenticated;
grant execute on function public.get_operator_id() to service_role;




insert into public.operator_identity (singleton, user_id)
select true, u.id from auth.users u order by u.created_at asc limit 1
on conflict (singleton) do nothing;



drop policy if exists "authenticated read conversas" on public.conversas_externas;
create policy "operator reads conversas" on public.conversas_externas
  for select to authenticated using (public.is_operator());

drop policy if exists "authenticated read mensagens" on public.mensagens_externas;
create policy "operator reads mensagens" on public.mensagens_externas
  for select to authenticated using (public.is_operator());


drop policy if exists "operator reads events" on public.events;
create policy "operator reads events" on public.events
  for select to authenticated using (public.is_operator());


revoke execute on function public.set_plano_item(uuid, int, jsonb) from public, anon, authenticated;
