create table if not exists custom_envios (
  id uuid primary key default gen_random_uuid(),
  dedup_key text not null,
  destino text not null,
  canal_id uuid references canais(id) on delete set null,
  status text not null default 'reservado' check (status in ('reservado', 'enviado', 'falhou')),
  external_id text,
  erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists custom_envios_dedup_key_idx on custom_envios (dedup_key);
create index if not exists custom_envios_created_at_idx on custom_envios (created_at desc);

alter table custom_envios enable row level security;
grant all on table custom_envios to service_role;
