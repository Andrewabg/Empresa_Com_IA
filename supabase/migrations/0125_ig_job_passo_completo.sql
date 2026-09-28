-- 0125: marca de passo ja entregue por inteiro no job e devolucao de retomada gasta (aditiva).

alter table public.ig_jobs
  add column if not exists passo_completo boolean not null default false;

-- Desfaz a retomada que a varredura contou e que nao chegou a acontecer.
create or replace function public.ig_devolver_retomada(p_run_id uuid)
returns void language sql
set search_path = public
as $$
  update public.ig_automacao_runs
     set recuperacoes = greatest(0, recuperacoes - 1)
   where id = p_run_id;
$$;

revoke execute on function public.ig_devolver_retomada(uuid) from public, anon, authenticated;
grant execute on function public.ig_devolver_retomada(uuid) to service_role;
