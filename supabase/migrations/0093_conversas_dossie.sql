-- 0093: dossie de handoff da conversa (aditiva). Nulo = nunca foi escalada.
alter table public.conversas_externas
  add column if not exists dossie jsonb;
