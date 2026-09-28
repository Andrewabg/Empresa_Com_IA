

create table if not exists public.hiring_sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'em_andamento'
    check (status in ('em_andamento','contratado','abandonado')),
  mode text not null default 'criacao' check (mode in ('criacao','revisao')),
  agent_id text references public.agents(id) on delete set null,
  brief jsonb not null default '{}'::jsonb,
  spec_draft jsonb,
  
  
  candidato jsonb,
  transcript jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hiring_sessions_status_idx on public.hiring_sessions (status, updated_at desc);

grant all on table public.hiring_sessions to service_role;



alter table public.hiring_sessions enable row level security;
create policy "operator reads hiring_sessions" on public.hiring_sessions
  for select to authenticated using (public.is_operator());
