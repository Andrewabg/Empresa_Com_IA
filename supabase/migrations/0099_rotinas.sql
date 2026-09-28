-- 0099: rotinas — trabalho recorrente que a empresa faz sozinha.
create table if not exists public.rotinas (
  id               uuid primary key default gen_random_uuid(),
  agent_id         text not null references public.agents(id) on delete cascade,
  titulo           text not null,
  pedido           text not null,
  frequencia       text not null check (frequencia in ('diaria','semanal','mensal')),
  hora             text not null,
  dia_semana       smallint check (dia_semana between 0 and 6),
  dia_mes          smallint check (dia_mes between 1 and 31),
  ativa            boolean not null default true,
  proxima_execucao timestamptz not null,
  ultima_execucao  timestamptz,
  ultima_task_id   uuid references public.tasks(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- O varredor do heartbeat busca por (ativa, proxima_execucao) a cada tick.
create index if not exists rotinas_vencidas_idx
  on public.rotinas (proxima_execucao) where ativa;
create index if not exists rotinas_agent_idx on public.rotinas (agent_id);

alter table public.rotinas enable row level security;
grant all on table public.rotinas to service_role;
