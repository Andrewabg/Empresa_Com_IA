




alter table public.cost_events drop constraint if exists cost_events_kind_check;

alter table public.cost_events
  add constraint cost_events_kind_check
  check (kind in ('chat', 'embedding', 'curator', 'realtime'));
