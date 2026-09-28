create index if not exists fonte_execucoes_created_at_idx
  on public.fonte_execucoes (created_at);

create index if not exists fonte_consultas_fonte_id_idx
  on public.fonte_consultas (fonte_id);
