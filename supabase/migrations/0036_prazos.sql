

create table if not exists public.prazos (
  id            uuid primary key default gen_random_uuid(),
  operator_id   uuid not null references auth.users(id) on delete cascade,
  agent_id      text not null default 'juridico',
  contrato_id   uuid references public.contratos(id) on delete cascade,
  tipo          text not null check (tipo in ('renovacao','aviso_previo','expiracao','pagamento','compromisso')),
  titulo        text not null,
  data_alvo     date not null,
  janela_dias   int  not null default 30,
  status        text not null default 'ativo' check (status in ('ativo','resolvido','dispensado')),
  meta          jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists prazos_radar_idx on public.prazos (operator_id, status, data_alvo);
create index if not exists prazos_contrato_idx on public.prazos (contrato_id);

alter table public.prazos enable row level security;
grant all on table public.prazos to service_role;
