


create table public.metric_snapshots (
  id           uuid primary key default gen_random_uuid(),
  operator_id  uuid not null references auth.users(id) on delete cascade,
  source       text not null default 'metaads',
  level        text not null check (level in ('account','campaign','adset','ad')),
  entity_id    text not null,
  entity_name  text,
  period_start date not null,
  period_end   date not null,
  metrics      jsonb not null default '{}'::jsonb,
  fetched_at   timestamptz not null default now()
);
create index metric_snapshots_lookup_idx
  on public.metric_snapshots (operator_id, source, level, fetched_at desc);

create table public.painel_blocos (
  id           uuid primary key default gen_random_uuid(),
  operator_id  uuid not null references auth.users(id) on delete cascade,
  agent_id     text not null default 'gestor-trafego',
  type         text not null check (type in (
    'kpi','timeseries','table','funnel','comparison',
    'creatives','audiences','goals','health','recommendation','note')),
  config       jsonb not null default '{}'::jsonb,
  snapshot_id  uuid references public.metric_snapshots(id) on delete set null,
  annotation   text,
  position     int  not null default 0,
  status       text not null default 'active' check (status in ('active','done')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index painel_blocos_lookup_idx
  on public.painel_blocos (operator_id, agent_id, position);

alter table public.metric_snapshots enable row level security;
alter table public.painel_blocos    enable row level security;
grant all on table public.metric_snapshots to service_role;
grant all on table public.painel_blocos    to service_role;
