-- 0077_acao_resultados.sql — closed-loop de resultado do Rui (Fatia 2). Aditiva/expand-only.
create table if not exists acao_resultados (
  id             uuid primary key default gen_random_uuid(),
  operator_id    uuid not null,
  approval_id    uuid not null references public.approvals(id) on delete cascade,
  account_id     text not null,
  entity_id      text not null,
  nivel          text,
  tipo           text not null,
  metrica        text,
  direcao        text,
  entidade_antes double precision,
  entidade_depois double precision,
  conta_antes    double precision,
  conta_depois   double precision,
  delta_liquido  double precision,
  veredito       text not null,
  motivo         text,
  acao_em        timestamptz,
  medido_em      timestamptz not null default now()
);
create unique index if not exists acao_resultados_uidx
  on acao_resultados (approval_id, entity_id);
create index if not exists acao_resultados_entidade
  on acao_resultados (operator_id, account_id, entity_id);
grant all on table public.acao_resultados to service_role;
alter table public.acao_resultados enable row level security;

-- kind 'attribution' na fila memory_jobs (job de medição — Fatia 2).
alter table public.memory_jobs drop constraint if exists memory_jobs_kind_check;
alter table public.memory_jobs add constraint memory_jobs_kind_check
  check (kind in ('reflect','rollup','reflect_task','reflect_account','reflect_juridico','reflect_atendimento','reflect_brand','reflect_peca','entrevista_commit','attribution'));
