






create table public.episodic_memory (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  summary         text not null,
  embedding       extensions.vector(1536),
  tags            text[] not null default '{}',
  importance      real not null default 0.5,   
  created_at      timestamptz not null default now(),
  last_accessed   timestamptz
);
create index episodic_memory_created_idx on public.episodic_memory (created_at desc);
create index episodic_memory_embedding_idx on public.episodic_memory
  using hnsw (embedding extensions.vector_cosine_ops) where (embedding is not null);






create or replace function public.episodic_search(query_embedding extensions.vector, match_count int)
returns table (id uuid, conversation_id uuid, summary text, tags text[], created_at timestamptz, distance float)
language sql stable as $$
  select e.id, e.conversation_id, e.summary, e.tags, e.created_at,
         (e.embedding <=> query_embedding) as distance
  from public.episodic_memory e
  where e.embedding is not null
  order by e.embedding <=> query_embedding
  limit match_count
$$;


alter table public.conversations add column reflected_at timestamptz;


alter table public.episodic_memory enable row level security;
grant all on table public.episodic_memory to service_role;
grant execute on function public.episodic_search(extensions.vector, int) to service_role;
grant usage, select on all sequences in schema public to service_role;
