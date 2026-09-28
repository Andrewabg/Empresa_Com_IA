-- 0136: intenções permanentes de vigilância declarada (aditiva).

create table if not exists public.intencoes_permanentes (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null references public.agents(id) on delete cascade,
  operator_id   uuid,
  descricao     text not null,
  fonte         text not null default 'atendimento'
                  check (fonte in ('atendimento','tarefa','cerebro')),
  palavras      text[] not null default '{}',
  modo_casamento text not null default 'contem'
                  check (modo_casamento in ('contem','exata','exata_normalizada')),
  estado        text not null default 'ativa'
                  check (estado in ('ativa','disparada','expirada','cancelada')),
  disparos      integer not null default 0,
  max_disparos  integer not null default 3,
  ultimo_disparo_em timestamptz,
  expira_em     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists intencoes_ativas_idx
  on public.intencoes_permanentes (fonte) where estado = 'ativa';
create index if not exists intencoes_expira_idx
  on public.intencoes_permanentes (expira_em) where estado = 'ativa' and expira_em is not null;
create index if not exists intencoes_agente_idx
  on public.intencoes_permanentes (agent_id);

alter table public.intencoes_permanentes enable row level security;
grant all on table public.intencoes_permanentes to service_role;
