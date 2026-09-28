





alter table public.agents add column manager_id text references public.agents(id) on delete set null;


create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  agent_id        text not null references public.agents(id),     
  created_by      text references public.agents(id),              
  conversation_id uuid references public.conversations(id),       
  objective       text not null,
  status          text not null default 'queued'
                    check (status in ('queued','running','needs_approval','done','failed','cancelled')),
  parent_task_id  uuid references public.tasks(id) on delete set null,
  budget_usd      numeric,                                        
  spent_usd       numeric not null default 0,
  steps           int not null default 0,                         
  working_state   jsonb,                                          
  result          text,                                           
  approval_id     uuid references public.approvals(id),           
  heartbeat_at    timestamptz,                                    
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index tasks_status_idx on public.tasks (status);


alter table public.approvals add column task_id uuid references public.tasks(id) on delete set null;


alter table public.cost_events add column task_id uuid references public.tasks(id) on delete set null;


alter table public.tasks enable row level security;
grant all on table public.tasks to service_role;
