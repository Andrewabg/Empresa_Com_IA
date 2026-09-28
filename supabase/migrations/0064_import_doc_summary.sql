alter table public.brain_import_files
  add column if not exists doc_summary text;
