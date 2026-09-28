alter table public.memory_candidates
  add column if not exists content_hash text;

create index if not exists memory_candidates_content_hash_idx
  on public.memory_candidates (content_hash);

alter table public.brain_import_files
  add column if not exists file_hash text;

create index if not exists brain_import_files_file_hash_idx
  on public.brain_import_files (file_hash);
