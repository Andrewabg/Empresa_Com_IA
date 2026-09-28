
create table if not exists public.account_memory (
  operator_id  uuid not null references auth.users(id) on delete cascade,
  account_id   text not null,
  perfil       jsonb not null default '{}'::jsonb,
  aprendizados jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now(),
  primary key (operator_id, account_id)
);
alter table public.account_memory enable row level security;
grant all on table public.account_memory to service_role;

alter table public.memory_jobs drop constraint if exists memory_jobs_kind_check;
alter table public.memory_jobs add constraint memory_jobs_kind_check
  check (kind in ('reflect','rollup','reflect_task','reflect_account'));
