-- 0140: o índice das candidatas descartadas passa a casar com a ordenação da consulta (aditiva).

drop index if exists public.memory_candidates_descartada_idx;

create index if not exists memory_candidates_descartada_recentes_idx
  on public.memory_candidates (processed_at desc nulls last)
  where status = 'descartada';
