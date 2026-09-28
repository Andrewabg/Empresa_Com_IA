

create table approvals (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'brain_pr' check (kind in ('brain_pr', 'tool_action')),
  title text,
  diff text,
  path text,
  pr_url text,
  pr_number int,
  agent text,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  candidate_id bigint references memory_candidates(id) on delete set null,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references auth.users(id),
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text,
  tool_payload jsonb,
  created_at timestamptz default now()
);


alter table approvals enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;


grant all on table public.approvals to service_role;
grant all on table public.conversations to service_role;
grant all on table public.messages to service_role;


grant usage, select on all sequences in schema public to service_role;
