

















alter table public.base_conhecimento
  add column if not exists embedding_version text;




create index if not exists base_conhecimento_embver_null_idx
  on public.base_conhecimento (created_at)
  where embedding_version is null;
