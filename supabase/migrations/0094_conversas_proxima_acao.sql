-- 0094: fila de proxima acao da conversa (aditiva) — follow-up dentro da janela.
alter table public.conversas_externas
  add column if not exists proxima_acao     text,
  add column if not exists proxima_acao_em  timestamptz,
  add column if not exists toques           integer not null default 0;

create index if not exists conversas_externas_proxima_acao_idx
  on public.conversas_externas (proxima_acao_em)
  where proxima_acao is not null;
