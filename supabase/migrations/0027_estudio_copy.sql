




create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  slug        text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (operator_id, slug)
);
create index if not exists brands_operator_idx on public.brands (operator_id);


create table if not exists public.brand_memory (
  operator_id  uuid not null references auth.users(id) on delete cascade,
  brand_id     uuid not null references public.brands(id) on delete cascade,
  dna          jsonb not null default '{}'::jsonb,
  voz_mae      jsonb not null default '{}'::jsonb,
  dialetos     jsonb not null default '{}'::jsonb,
  aprendizados jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now(),
  primary key (operator_id, brand_id)
);


create table if not exists public.pecas (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid not null references auth.users(id) on delete cascade,
  brand_id    uuid not null references public.brands(id) on delete cascade,
  agent_id    text not null,
  formato     text not null,
  titulo      text not null default '',
  brief       jsonb not null default '{}'::jsonb,
  status      text not null default 'rascunho'
              check (status in ('brief','rascunho','revisao','aprovada','arquivada')),
  
  
  origem      text not null default 'operador',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pecas_operator_brand_idx on public.pecas (operator_id, brand_id, position);
create index if not exists pecas_agent_idx on public.pecas (agent_id);


create table if not exists public.peca_versoes (
  id             uuid primary key default gen_random_uuid(),
  peca_id        uuid not null references public.pecas(id) on delete cascade,
  n              integer not null,
  variacoes      jsonb not null default '[]'::jsonb,
  veredito       jsonb not null default '{}'::jsonb,
  critica        jsonb not null default '{}'::jsonb,
  origem_revisao text,
  created_at     timestamptz not null default now(),
  unique (peca_id, n)
);
create index if not exists peca_versoes_peca_idx on public.peca_versoes (peca_id, n);

alter table public.brands       enable row level security;
alter table public.brand_memory enable row level security;
alter table public.pecas        enable row level security;
alter table public.peca_versoes enable row level security;
grant all on table public.brands       to service_role;
grant all on table public.brand_memory to service_role;
grant all on table public.pecas        to service_role;
grant all on table public.peca_versoes to service_role;
