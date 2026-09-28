






create table if not exists public.events (
  id         text primary key,
  type       text not null check (type in ('memory', 'action', 'tool')),
  label      text not null,
  agent      text,
  created_at timestamptz not null default now()
);




create table if not exists public.cost_events (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  kind              text not null check (kind in ('chat', 'embedding', 'curator')),
  model             text not null,
  prompt_tokens     int not null default 0,
  completion_tokens int not null default 0,
  amount_usd        numeric(12,6) not null default 0,
  agent             text,
  tool              text
);



create index if not exists cost_events_created_at_idx on public.cost_events (created_at);



grant all on table public.events to service_role;
grant all on table public.cost_events to service_role;


grant usage, select on all sequences in schema public to service_role;







grant usage on schema public to authenticated;

alter table events enable row level security;
create policy "operator reads events" on events
  for select to authenticated using (true);
grant select on table public.events to authenticated;

alter publication supabase_realtime add table events;



alter table cost_events enable row level security;




insert into settings (key, value)
  values ('budget_usd', '50')
  on conflict (key) do nothing;
