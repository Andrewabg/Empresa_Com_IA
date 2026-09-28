alter table public.memory_jobs drop constraint if exists memory_jobs_kind_check;
alter table public.memory_jobs add constraint memory_jobs_kind_check
  check (kind in ('reflect','rollup','reflect_task','reflect_account','reflect_juridico','reflect_atendimento','reflect_brand','reflect_design','reflect_peca','entrevista_commit','attribution'));
