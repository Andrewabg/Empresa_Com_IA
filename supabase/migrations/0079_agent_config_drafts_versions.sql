create table if not exists agent_config_drafts (
  agent_id      text primary key references agents(id) on delete cascade,
  delta         jsonb not null default '{}'::jsonb,
  base_snapshot jsonb not null,
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);

create table if not exists agent_config_versions (
  id           uuid primary key default gen_random_uuid(),
  agent_id     text not null references agents(id) on delete cascade,
  snapshot     jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid
);
create index if not exists idx_agent_config_versions_agent on agent_config_versions (agent_id, published_at desc);

alter table agent_config_drafts   enable row level security;
alter table agent_config_versions enable row level security;

create policy agent_config_drafts_operator   on agent_config_drafts   for all using (public.is_operator()) with check (public.is_operator());
create policy agent_config_versions_operator on agent_config_versions for all using (public.is_operator()) with check (public.is_operator());

grant all on table public.agent_config_drafts   to service_role;
grant all on table public.agent_config_versions to service_role;
