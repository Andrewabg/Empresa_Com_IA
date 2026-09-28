-- 0095: cost_events aceita o kind 'plataforma' (mensagem cobrada pela Meta).
-- Ampliacao de CHECK: expand-safe (o container antigo nunca grava o valor novo).
alter table public.cost_events drop constraint if exists cost_events_kind_check;
alter table public.cost_events
  add constraint cost_events_kind_check
  check (kind in ('chat', 'embedding', 'curator', 'realtime', 'action', 'plataforma'));
