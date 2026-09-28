






alter table public.approvals drop constraint if exists approvals_kind_check;
alter table public.approvals add constraint approvals_kind_check check (kind in ('brain_pr','tool_action','plan'));
alter table public.approvals add column if not exists plan_id uuid;


alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('queued','running','needs_approval','needs_children','done','failed','cancelled'));
alter table public.tasks add column if not exists plan_id uuid;


create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  objective text not null,
  status text not null default 'pending_approval'
    check (status in ('pending_approval','approved','rejected','executing','done','failed')),
  replans int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create unique index if not exists plans_task_idx on public.plans(task_id);


create table if not exists public.plan_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  ordinal int not null,
  role text not null,
  sub_objective text not null,
  depends_on int[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending','delegated','done','failed','skipped')),
  agent_id text,
  child_task_id uuid references public.tasks(id) on delete set null,
  result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plan_steps_plan_idx on public.plan_steps(plan_id);

create index if not exists plan_steps_child_task_idx on public.plan_steps(child_task_id);
create index if not exists tasks_parent_idx on public.tasks(parent_task_id);


alter table public.plans enable row level security;
grant all on table public.plans to service_role;
alter table public.plan_steps enable row level security;
grant all on table public.plan_steps to service_role;
