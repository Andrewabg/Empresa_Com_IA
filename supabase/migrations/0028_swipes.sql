


create table if not exists public.swipes (
  id           uuid primary key default gen_random_uuid(),
  operator_id  uuid not null references auth.users(id) on delete cascade,
  brand_id     uuid not null references public.brands(id) on delete cascade,
  agent_id     text not null,              
  titulo       text not null,
  fonte        text,                        
  conteudo     text not null,               
  desmontagem  jsonb not null default '{}'::jsonb, 
  tags         text[] not null default '{}', 
  
  origem       text not null default 'copywriter',
  created_at   timestamptz not null default now()
);
create index if not exists swipes_brand_idx on public.swipes (operator_id, brand_id, created_at desc);
alter table public.swipes enable row level security;
grant all on table public.swipes to service_role;
