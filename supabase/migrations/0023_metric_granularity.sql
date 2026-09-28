
alter table public.metric_snapshots
  add column granularity text not null default 'window'
  check (granularity in ('day','window'));
create unique index metric_snapshots_daily_uidx
  on public.metric_snapshots (operator_id, source, level, entity_id, period_start)
  where granularity = 'day';
