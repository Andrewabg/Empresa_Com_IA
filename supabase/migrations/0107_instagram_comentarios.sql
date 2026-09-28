-- 0107: comentarios recebidos do Instagram (aditiva).
create table if not exists public.ig_comentarios (
  id                uuid primary key default gen_random_uuid(),
  canal_id          uuid not null references public.canais(id) on delete cascade,
  external_id       text not null,
  midia_id          text not null,
  permalink         text,
  parent_id         text,
  autor_external_id text not null,
  autor_nome        text,
  texto             text not null,
  comentado_em      timestamptz not null,
  run_id            uuid,
  created_at        timestamptz not null default now(),
  unique (canal_id, external_id)
);

create index if not exists ig_comentarios_canal_idx
  on public.ig_comentarios (canal_id, comentado_em desc);
create index if not exists ig_comentarios_midia_idx
  on public.ig_comentarios (canal_id, midia_id);

alter table public.ig_comentarios enable row level security;
grant all on table public.ig_comentarios to service_role;

-- Os DOIS CHECKs da tabela de canais precisam do valor novo. Nomes conferidos no banco.
alter table public.canais drop constraint if exists canais_provider_check;
alter table public.canais add constraint canais_provider_check
  check (provider in ('whatsapp_cloud','uazapi','instagram'));

alter table public.canais drop constraint if exists canais_tipo_check;
alter table public.canais add constraint canais_tipo_check
  check (tipo in ('whatsapp','instagram'));
