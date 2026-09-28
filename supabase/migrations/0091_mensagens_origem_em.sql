-- 0091: timestamp do payload do provider (aditiva). Nulo = linha antiga, usa created_at.
alter table public.mensagens_externas
  add column if not exists origem_em timestamptz;

create index if not exists mensagens_externas_conversa_ordem_idx
  on public.mensagens_externas (conversa_id, coalesce(origem_em, created_at) desc);
