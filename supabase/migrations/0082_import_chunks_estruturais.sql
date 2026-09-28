alter table public.brain_import_files
  add column if not exists chunks     jsonb,
  add column if not exists image_refs jsonb;
