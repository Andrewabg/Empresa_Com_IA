create extension if not exists vector with schema extensions;

create table sync_state (
  id int primary key default 1 check (id = 1),
  last_synced_sha text,
  embedding_version text,
  updated_at timestamptz not null default now()
);
insert into sync_state (id) values (1) on conflict do nothing;

create table notes (
  id text primary key,
  path text unique not null,
  title text,
  type text,
  tags text[] not null default '{}',
  confidence real not null default 0.5,
  created timestamptz not null default now(),
  updated timestamptz not null default now(),
  last_accessed timestamptz,
  access_count int not null default 0
);

create table note_chunks (
  id bigint generated always as identity primary key,
  note_id text not null references notes(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  fts tsvector generated always as (to_tsvector('simple', content)) stored,
  embedding extensions.vector(1536)
);
create index note_chunks_fts_idx on note_chunks using gin (fts);
create index note_chunks_embedding_idx on note_chunks using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;
create index note_chunks_note_id_idx on note_chunks (note_id);


create table edges (
  id bigint generated always as identity primary key,
  from_id text not null,
  to_id text not null,
  relation text not null default 'links',
  created_at timestamptz not null default now(),
  unique (from_id, to_id, relation)
);

create table memory_candidates (
  id bigint generated always as identity primary key,
  source_type text not null,
  source_ref text,
  raw_content text not null,
  suggested_type text,
  suggested_tags text[] not null default '{}',
  author_agent text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  result jsonb
);

create or replace function increment_access(p_id text)
returns void language sql as $$
  update notes set access_count = access_count + 1, last_accessed = now() where id = p_id;
$$;
