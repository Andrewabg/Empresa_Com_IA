-- 0129: contador proprio de esfriamento na fila de atendimento (aditiva).

alter table public.atendimento_jobs
  add column if not exists esfriamentos smallint not null default 0;
