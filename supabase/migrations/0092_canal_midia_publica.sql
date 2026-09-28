-- 0092: catálogo FECHADO de arquivos que o atendente pode enviar ao cliente (aditiva).
create table if not exists public.canal_midia_publica (
  id             uuid primary key default gen_random_uuid(),
  canal_id       uuid not null references public.canais(id) on delete cascade,
  slug           text not null,
  rotulo         text not null default '',
  descricao      text not null default '',
  storage_bucket text not null default 'atendimento-midia',
  storage_path   text not null,
  mime           text not null,
  bytes          integer not null default 0,
  enabled        boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (canal_id, slug)
);

create index if not exists canal_midia_publica_canal_idx
  on public.canal_midia_publica (canal_id) where enabled;

alter table public.canal_midia_publica enable row level security;
grant all on table public.canal_midia_publica to service_role;
