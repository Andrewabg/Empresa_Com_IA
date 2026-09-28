













alter table public.cost_events
  add column if not exists cached_tokens integer not null default 0;
