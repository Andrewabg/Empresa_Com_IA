
















alter table public.memory_candidates
  add column if not exists attempts int not null default 0;

alter table public.memory_candidates
  add column if not exists last_attempt_at timestamptz;




create index if not exists memory_candidates_retry_idx
  on public.memory_candidates (last_attempt_at)
  where status = 'error';
