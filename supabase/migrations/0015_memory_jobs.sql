


create table public.memory_jobs (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('reflect','rollup')),
  ref          text not null,              
  status       text not null default 'queued' check (status in ('queued','running','done','failed','dead')),
  attempts     int  not null default 0,
  max_attempts int  not null default 3,
  last_error   text,
  heartbeat_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index memory_jobs_status_idx on public.memory_jobs (status);

create unique index memory_jobs_live_uniq on public.memory_jobs (kind, ref) where status in ('queued','running');

alter table public.memory_jobs enable row level security;
grant all on table public.memory_jobs to service_role;
grant usage, select on all sequences in schema public to service_role;
