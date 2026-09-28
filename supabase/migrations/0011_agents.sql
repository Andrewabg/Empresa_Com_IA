



create table agents (
  id                text primary key,                 
  name              text not null,                    
  role              text not null,                    
  system_prompt     text not null,                    
  model             text,                             
  tools             jsonb not null default '{}'::jsonb,  
  enabled           boolean not null default true,    
  is_primary        boolean not null default false,   
  brain_read_scopes text[]  not null default '{}',    
  budget            jsonb,                            
  sensitive_policy  jsonb,                            
  triggers          jsonb,                            
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


create unique index agents_one_primary on public.agents (is_primary) where (is_primary);



alter table agents enable row level security;
grant all on table public.agents to service_role;
