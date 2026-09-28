


create table if not exists public.notificacoes (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null,
  titulo      text not null,
  corpo       text not null,
  urgencia    text not null check (urgencia in ('imediata','briefing')),
  status      text not null default 'pendente'
              check (status in ('pendente','enviando','enviada','agrupada_no_briefing','suprimida','falhou')),
  payload     jsonb not null default '{}'::jsonb,
  dedup_key   text,
  tentativas  int not null default 0,
  claimed_at  timestamptz,          
  created_at  timestamptz not null default now(),
  enviada_at  timestamptz
);

create unique index if not exists notificacoes_dedup_idx
  on public.notificacoes (dedup_key) where dedup_key is not null;

create index if not exists notificacoes_pendentes_idx
  on public.notificacoes (created_at) where status = 'pendente';
create index if not exists notificacoes_enviando_idx
  on public.notificacoes (claimed_at) where status = 'enviando';
alter table public.notificacoes enable row level security;
grant all on table public.notificacoes to service_role;

create table if not exists public.lembretes (
  id           uuid primary key default gen_random_uuid(),
  texto        text not null,
  due_at       timestamptz not null,
  recorrencia  text check (recorrencia in ('diaria','semanal','mensal')),
  status       text not null default 'agendado' check (status in ('agendado','disparado','cancelado')),
  created_at   timestamptz not null default now()
);
create index if not exists lembretes_vencidos_idx
  on public.lembretes (due_at) where status = 'agendado';
alter table public.lembretes enable row level security;
grant all on table public.lembretes to service_role;
