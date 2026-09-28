alter table public.fonte_consultas
  add column if not exists ultimo_agregado jsonb;
