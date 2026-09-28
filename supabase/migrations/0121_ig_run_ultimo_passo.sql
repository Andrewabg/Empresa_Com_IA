-- 0121: ultimo passo do run do Instagram cujo envio essencial foi entregue (aditiva).
alter table public.ig_automacao_runs
  add column if not exists ultimo_passo_entregue smallint;
alter table public.ig_automacao_runs
  drop column if exists resposta_privada_em;
