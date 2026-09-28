-- 0139: índice parcial das candidatas descartadas pelo portão de origem (aditiva).

create index if not exists memory_candidates_descartada_idx
  on public.memory_candidates (processed_at desc)
  where status = 'descartada';
