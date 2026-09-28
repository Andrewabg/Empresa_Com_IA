create index if not exists metric_snapshots_day_idx
  on public.metric_snapshots (operator_id, level, period_start desc)
  where granularity = 'day';
