-- 0123: estados do run do Instagram, marca de dono do job e retomada de run orfao (aditiva).

alter table public.ig_automacao_runs
  add column if not exists recuperacoes smallint not null default 0;
alter table public.ig_automacao_runs
  add column if not exists repeticoes smallint not null default 0;

alter table public.ig_automacao_runs
  drop constraint if exists ig_automacao_runs_status_check;
alter table public.ig_automacao_runs
  add constraint ig_automacao_runs_status_check
  check (status in ('pendente','enviando','concluido','falhou','pulado_repetido','interrompido'));

alter table public.ig_jobs
  add column if not exists claim_id uuid;

create index if not exists ig_runs_orfaos_idx
  on public.ig_automacao_runs (created_at) where status in ('pendente','enviando');

create index if not exists ig_automacoes_midias_adicionais_idx
  on public.ig_automacoes using gin (midia_ids_adicionais) where status = 'ativa';

alter table public.ig_automacoes
  drop constraint if exists ig_automacoes_agent_id_fkey;
alter table public.ig_automacoes
  add constraint ig_automacoes_agent_id_fkey
  foreign key (agent_id) references public.agents(id) on delete restrict not valid;

-- Runs vivos que ficaram sem job nenhum. Cada linha devolvida ja sai com `recuperacoes`
-- somado, e o `skip locked` impede que duas passadas peguem o mesmo run.
create or replace function public.ig_reclamar_runs_orfaos(
  p_corte timestamptz, p_limite integer
) returns setof public.ig_automacao_runs language plpgsql
set search_path = public
as $$
begin
  return query
  update public.ig_automacao_runs r
     set recuperacoes = r.recuperacoes + 1
   where r.id in (
     select r2.id from public.ig_automacao_runs r2
      where r2.status in ('pendente','enviando')
        and r2.created_at < p_corte
        and not exists (
          select 1 from public.ig_jobs j
           where j.run_id = r2.id and j.status in ('queued','running')
        )
      order by r2.created_at
      limit greatest(1, least(coalesce(p_limite, 20), 200))
      for update skip locked
   )
  returning r.*;
end $$;

revoke execute on function public.ig_reclamar_runs_orfaos(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.ig_reclamar_runs_orfaos(timestamptz, integer) to service_role;

-- O mesmo comentario chegou de novo e o run ja existia: conta a repeticao na linha que existe.
create or replace function public.ig_marcar_repeticao(
  p_automacao_id uuid, p_ig_user_id text, p_origem_id text
) returns void language sql
set search_path = public
as $$
  update public.ig_automacao_runs
     set repeticoes = repeticoes + 1
   where automacao_id = p_automacao_id
     and ig_user_id = p_ig_user_id
     and origem_id = p_origem_id;
$$;

revoke execute on function public.ig_marcar_repeticao(uuid, text, text) from public, anon, authenticated;
grant execute on function public.ig_marcar_repeticao(uuid, text, text) to service_role;

-- Contador de painel sem tocar `updated_at`: essa coluna e a data da ultima EDICAO, e quem
-- liga a automacao a compara para recusar um clique feito sobre a tela desatualizada.
create or replace function public.ig_incrementar_contador(
  p_automacao_id uuid, p_coluna text, p_quanto integer
) returns void language plpgsql security definer
set search_path = public
as $$
begin
  if p_coluna not in ('disparos','dms_enviadas','respostas_publicas') then
    raise exception 'coluna invalida';
  end if;
  execute format('update public.ig_automacoes set %I = %I + $1 where id = $2', p_coluna, p_coluna)
    using p_quanto, p_automacao_id;
end $$;

revoke execute on function public.ig_incrementar_contador(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.ig_incrementar_contador(uuid, text, integer) to service_role;
