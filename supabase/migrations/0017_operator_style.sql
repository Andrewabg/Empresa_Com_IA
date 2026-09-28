

create table public.operator_style (
  operator_id      uuid primary key references auth.users(id) on delete cascade,
  dials            jsonb       not null default '{}'::jsonb,  
  notas            text        not null default '',
  learning_paused  boolean     not null default false,
  last_change      jsonb,                                     
  updated_at       timestamptz not null default now()
);
alter table public.operator_style enable row level security;  
grant all on table public.operator_style to service_role;
