create table if not exists public.onboarding_session (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null unique,
  conversation_id uuid,
  perfil text check (perfil in ('tem_empresa','sem_empresa','revendedor','curioso')),
  fase text not null default 'abertura'
    check (fase in ('abertura','roteamento','entrevista','concluida','adiada')),
  slots jsonb not null default '[]'::jsonb,
  reflect_cutpoint_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.onboarding_session enable row level security;
grant all on public.onboarding_session to service_role;
create policy onboarding_session_sel on public.onboarding_session
  for select to authenticated using (public.is_operator());
create index if not exists onboarding_session_operator_idx on public.onboarding_session (operator_id);
