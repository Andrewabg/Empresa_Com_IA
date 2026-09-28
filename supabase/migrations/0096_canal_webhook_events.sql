-- 0096: caixa-preta dos webhooks de canal (payload cru, retencao curta).
create table if not exists public.canal_webhook_events (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,
  canal_id      uuid references public.canais(id) on delete set null,
  assinatura_ok boolean not null default false,
  payload       jsonb not null,
  created_at    timestamptz not null default now()
);
create index if not exists canal_webhook_events_created_idx
  on public.canal_webhook_events (created_at desc);
alter table public.canal_webhook_events enable row level security;
grant all on table public.canal_webhook_events to service_role;
