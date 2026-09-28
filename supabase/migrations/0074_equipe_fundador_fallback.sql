-- 0073_equipe_fundador_fallback.sql
-- Fecha o lockout de fresh-install: numa instância NOVA o backfill da 0072 não
-- semeia equipe_membros (operator_identity vazio na hora da migration); o 1º
-- operador nasce depois (login → bindOperatorIdentity) SEM linha em equipe_membros.
-- Sem isto, getMembro/papel_do_membro devolvem null → o próprio dono fundador fica
-- trancado fora. Solução canônica: o fundador (operator_identity singleton) é SEMPRE
-- um dono IMPLÍCITO, mesmo sem linha. Aditivo (create or replace), expand-only.
-- O insert explícito na tela de login (mesma release) mantém a linha real p/ o card
-- da Equipe / contarDonos; este fallback é a rede de segurança canônica.

create or replace function public.is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.equipe_membros em where em.user_id = (select auth.uid())
  ) or (select auth.uid()) = (
    select oi.user_id from public.operator_identity oi where oi.singleton
  );
$$;
revoke execute on function public.is_operator() from public;
grant execute on function public.is_operator() to authenticated, service_role;

create or replace function public.is_dono()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.equipe_membros em
    where em.user_id = (select auth.uid()) and em.papel = 'dono'
  ) or (select auth.uid()) = (
    select oi.user_id from public.operator_identity oi where oi.singleton
  );
$$;
revoke execute on function public.is_dono() from public;
grant execute on function public.is_dono() to authenticated, service_role;

create or replace function public.papel_do_membro(p_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select papel from public.equipe_membros where user_id = p_uid limit 1),
    (case when p_uid = (select oi.user_id from public.operator_identity oi where oi.singleton)
          then 'dono' end)
  );
$$;
revoke execute on function public.papel_do_membro(uuid) from public, anon, authenticated;
grant execute on function public.papel_do_membro(uuid) to service_role;
