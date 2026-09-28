




create table if not exists public.brain_imports (
  id           uuid primary key default gen_random_uuid(),
  operator_id  uuid not null references auth.users(id),
  status       text not null default 'queued',   
  file_count   int  not null default 0,
  fact_count   int  not null default 0,
  commit_shas  text[] not null default '{}',      
  summary      text,
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.brain_import_files (
  id           uuid primary key default gen_random_uuid(),
  import_id    uuid not null references public.brain_imports(id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  mime         text,
  bytes        bigint,
  status       text not null default 'queued',    
  attempts     int  not null default 0,
  max_attempts int  not null default 3,
  fact_count   int  not null default 0,
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists brain_import_files_import_id_idx on public.brain_import_files (import_id);
create index if not exists brain_import_files_status_idx on public.brain_import_files (status);

alter table public.brain_imports enable row level security;
alter table public.brain_import_files enable row level security;
grant all on table public.brain_imports to service_role;
grant all on table public.brain_import_files to service_role;

drop policy if exists "operator reads brain_imports" on public.brain_imports;
create policy "operator reads brain_imports" on public.brain_imports
  for select to authenticated using (public.is_operator());
drop policy if exists "operator reads brain_import_files" on public.brain_import_files;
create policy "operator reads brain_import_files" on public.brain_import_files
  for select to authenticated using (public.is_operator());
