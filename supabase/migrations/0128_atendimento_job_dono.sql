-- 0128: marca de dono do trabalho na fila de atendimento (aditiva).

alter table public.atendimento_jobs
  add column if not exists claim_id uuid;
