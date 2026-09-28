alter table public.brain_import_files
  add column if not exists extracted_text  text,
  add column if not exists ocr_pages_total int not null default 0,
  add column if not exists ocr_pages_done  int not null default 0,
  add column if not exists chunks_total    int not null default 0,
  add column if not exists chunks_done     int not null default 0;

create index if not exists brain_import_files_status_updated_idx
  on public.brain_import_files (status, updated_at);
