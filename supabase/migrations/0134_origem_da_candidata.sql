alter table public.memory_candidates
  add column if not exists origin_class text
    check (origin_class in ('dono','agente','terceiro','sistema'));

create index if not exists memory_candidates_origin_idx
  on public.memory_candidates (origin_class) where status = 'pending';
