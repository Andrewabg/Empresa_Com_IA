-- 0071_webhook_events.sql — fila de eventos de webhook da zona custom/ (aditiva, expand-only).
create table if not exists webhook_events (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null,
  dedup_key       text,
  payload         jsonb not null,
  headers         jsonb,
  status          text not null default 'queued',
  attempts        integer not null default 0,
  next_attempt_at timestamptz,
  last_error      text,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz
);
create unique index if not exists webhook_events_dedup
  on webhook_events (slug, dedup_key) where dedup_key is not null;
create index if not exists webhook_events_fila
  on webhook_events (status, next_attempt_at);
grant all on table public.webhook_events to service_role;
-- RLS on sem policy = nega anon/authenticated (a anon key é pública); só service_role acessa
-- (bypassa RLS), como as filas-irmãs (notificacoes/atendimento_jobs/memory_jobs).
alter table public.webhook_events enable row level security;
-- claimed_at: quando a linha foi claimada pro processing — permite cold-requeue de órfã
-- (processo morreu entre o claim e o done/retry), como listColdEnviando em notificacoes.
alter table public.webhook_events add column if not exists claimed_at timestamptz;
