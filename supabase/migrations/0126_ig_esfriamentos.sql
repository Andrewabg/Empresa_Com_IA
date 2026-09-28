-- 0126: contador proprio de esfriamento no job e teto na contagem de retomadas (aditiva).

alter table public.ig_jobs
  add column if not exists esfriamentos smallint not null default 0;

-- A contagem para de crescer sem fim quando um disparo fica muito tempo sem conseguir voltar.
create or replace function public.ig_reclamar_runs_orfaos(
  p_corte timestamptz, p_limite integer
) returns setof public.ig_automacao_runs language plpgsql
set search_path = public
as $$
begin
  return query
  update public.ig_automacao_runs r
     set recuperacoes = least(r.recuperacoes + 1, 30000)
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
