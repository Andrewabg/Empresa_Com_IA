create index if not exists metric_snapshots_consulta_idx
  on public.metric_snapshots (operator_id, level, entity_id, fetched_at desc)
  where granularity = 'consulta';
