alter table public.metric_snapshots drop constraint if exists metric_snapshots_granularity_check;
alter table public.metric_snapshots add constraint metric_snapshots_granularity_check
  check (granularity in ('day','window','consulta'));
