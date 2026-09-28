















alter table public.episodic_memory
  add column if not exists embedding_version text;




create index if not exists episodic_memory_embver_null_idx
  on public.episodic_memory (created_at)
  where embedding_version is null;
