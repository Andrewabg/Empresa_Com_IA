
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references auth.users(id) on delete cascade,
  agent_id text not null default 'juridico',
  kind text not null check (kind in ('gerado','analisado','modelo')),
  tipo text not null,
  titulo text not null,
  partes jsonb not null default '[]'::jsonb,
  status text not null default 'rascunho'
    check (status in ('rascunho','em_revisao','recebido','analisado','finalizado','arquivado')),
  texto text not null default '',
  texto_original text,
  arquivo_ref text,
  parecer jsonb,
  meta jsonb not null default '{}'::jsonb,
  versao_atual int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contratos_operator_status_idx on public.contratos (operator_id, status);

create table if not exists public.contrato_versoes (
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  numero int not null,
  texto text not null,
  nota text,
  created_at timestamptz not null default now(),
  primary key (contrato_id, numero)
);

create table if not exists public.ficha_juridica (
  operator_id uuid primary key references auth.users(id) on delete cascade,
  perfil jsonb not null default '{}'::jsonb,
  aprendizados jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.contratos       enable row level security;
alter table public.contrato_versoes enable row level security;
alter table public.ficha_juridica  enable row level security;
grant all on table public.contratos        to service_role;
grant all on table public.contrato_versoes to service_role;
grant all on table public.ficha_juridica   to service_role;


alter table public.memory_jobs drop constraint if exists memory_jobs_kind_check;
alter table public.memory_jobs add constraint memory_jobs_kind_check
  check (kind in ('reflect','rollup','reflect_task','reflect_account','reflect_juridico'));
