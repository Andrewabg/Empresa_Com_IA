-- 0137: índice de apoio pra poda de notificacoes/lembretes (aditiva).

create index if not exists notificacoes_poda_idx
  on public.notificacoes (status, created_at);

create index if not exists lembretes_poda_idx
  on public.lembretes (status, created_at);
