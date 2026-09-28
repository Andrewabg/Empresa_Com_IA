-- 0120: marca de resposta privada no run do Instagram (aditiva).
alter table public.ig_automacao_runs
  add column if not exists resposta_privada_em timestamptz;
