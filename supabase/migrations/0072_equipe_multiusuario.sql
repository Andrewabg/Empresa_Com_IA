-- 0072_equipe_multiusuario.sql
-- Multiusuário: Dono + Membro. ADITIVA / expand-only (o container velho segue
-- funcionando: get_operator_id() inalterado; is_operator() só AMPLIA leitura).
-- operator_identity fica INTACTO = o operador fundador (alvo das superfícies do dono).

-- 1. Fonte da verdade de acesso + papel. email denormalizado p/ o card Equipe
--    (evita admin.listUsers no render).
create table if not exists public.equipe_membros (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  papel         text not null check (papel in ('dono','membro')),
  email         text,
  convidado_por uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
alter table public.equipe_membros enable row level security;
grant all on table public.equipe_membros to service_role;

-- Backfill: o operador fundador (operator_identity singleton) vira o 1º Dono.
insert into public.equipe_membros (user_id, papel, email)
select oi.user_id, 'dono', u.email
  from public.operator_identity oi
  join auth.users u on u.id = oi.user_id
  where oi.singleton
on conflict (user_id) do nothing;

-- 2. Convites de uso único (token HASHEADO — vazamento do banco não reusa o link).
create table if not exists public.equipe_convites (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null unique,
  papel       text not null check (papel in ('dono','membro')),
  criado_por  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expira_em   timestamptz not null,
  aceito_em   timestamptz,
  aceito_por  uuid references auth.users(id) on delete set null
);
alter table public.equipe_convites enable row level security;
grant all on table public.equipe_convites to service_role;

-- 3. is_dono() — é um Dono da equipe? (guarda o sensível novo)
create or replace function public.is_dono()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.equipe_membros em
    where em.user_id = (select auth.uid()) and em.papel = 'dono'
  );
$$;
revoke execute on function public.is_dono() from public;
grant execute on function public.is_dono() to authenticated, service_role;

-- 4. REDEFINE is_operator() = "é MEMBRO da equipe" (dono OU membro). create or
--    replace = aditivo. Amplia as policies existentes de "o operador" p/ "qualquer
--    membro". Nas policies for-all do 0058 (treino) isso é INERTE (aquelas tabelas
--    dão grant só a service_role; acesso real é serverDb, que bypassa RLS).
create or replace function public.is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.equipe_membros em
    where em.user_id = (select auth.uid())
  );
$$;
revoke execute on function public.is_operator() from public;
grant execute on function public.is_operator() to authenticated, service_role;

-- 5. papel_do_membro(uid) — RPC edge-safe p/ o middleware. service-role only,
--    mesmo padrão de grant do get_operator_id (0043).
create or replace function public.papel_do_membro(p_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select papel from public.equipe_membros where user_id = p_uid limit 1;
$$;
revoke execute on function public.papel_do_membro(uuid) from public, anon, authenticated;
grant execute on function public.papel_do_membro(uuid) to service_role;

-- 6. Mutações guardadas ATÔMICAS (fecham o TOCTOU do "nunca zero Donos"). O
--    predicado puro (src/lib/equipe.ts) é só pré-check de UI; ESTAS são a garantia.
--    Retornam rowcount (0 = bloqueado/inexistente). service-role only.
create or replace function public.equipe_set_papel(p_uid uuid, p_papel text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_papel not in ('dono','membro') then return 0; end if;
  update public.equipe_membros set papel = p_papel
    where user_id = p_uid
      and papel is distinct from p_papel
      and (p_papel = 'dono'  -- promover é sempre ok
           or (select count(*) from public.equipe_membros where papel = 'dono') > 1);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.equipe_set_papel(uuid, text) from public, anon, authenticated;
grant execute on function public.equipe_set_papel(uuid, text) to service_role;

create or replace function public.equipe_revogar(p_uid uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.equipe_membros
    where user_id = p_uid
      and (papel = 'membro'
           or (select count(*) from public.equipe_membros where papel = 'dono') > 1);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.equipe_revogar(uuid) from public, anon, authenticated;
grant execute on function public.equipe_revogar(uuid) to service_role;

-- 7. RLS das tabelas novas: Dono lê a equipe; escrita é service-role (handlers com
--    requireDonoApi). Convites nunca expostos ao cliente (SEM policy p/ authenticated
--    = intencional).
create policy equipe_membros_dono_read on public.equipe_membros
  for select to authenticated using (public.is_dono());
