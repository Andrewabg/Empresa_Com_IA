create table if not exists public.fontes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  tipo          text not null check (tipo in ('banco','composio','http','webhook')),
  secret_ref    text not null,
  ativa         boolean not null default true,
  ultimo_erro   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.fonte_consultas (
  id                     uuid primary key default gen_random_uuid(),
  fonte_id               uuid not null references public.fontes(id) on delete cascade,
  rotulo                 text not null,
  corpo                  text not null,
  nota_path              text,
  agenda                 jsonb not null,
  proxima_execucao       timestamptz not null,
  ultima_execucao        timestamptz,
  ultimo_agregado_hash   text,
  aprovada_em            timestamptz,
  aprovada_por           text,
  ativa                  boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists public.fonte_execucoes (
  id            uuid primary key default gen_random_uuid(),
  consulta_id   uuid not null references public.fonte_consultas(id) on delete cascade,
  registros     integer not null default 0,
  mudou         boolean not null default false,
  erro          text,
  created_at    timestamptz not null default now()
);

create index if not exists fonte_consultas_vencidas_idx
  on public.fonte_consultas (proxima_execucao)
  where ativa = true;

create index if not exists fonte_execucoes_consulta_idx
  on public.fonte_execucoes (consulta_id, created_at desc);

alter table public.fontes enable row level security;
alter table public.fonte_consultas enable row level security;
alter table public.fonte_execucoes enable row level security;

grant all on table public.fontes to service_role;
grant all on table public.fonte_consultas to service_role;
grant all on table public.fonte_execucoes to service_role;
