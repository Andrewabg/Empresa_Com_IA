-- 0143: claim por candidata na fila do Curador (aditiva).

alter table public.memory_candidates
  add column if not exists claimed_at timestamptz;
