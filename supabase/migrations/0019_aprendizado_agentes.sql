






create table public.agent_directives (
  agent_id   text primary key references public.agents(id) on delete cascade,
  diretrizes jsonb not null default '[]',  
  updated_at timestamptz not null default now()
);
alter table public.agent_directives enable row level security;
grant all on table public.agent_directives to service_role;


alter table public.episodic_memory add column agent_id text;  
create index episodic_memory_agent_idx on public.episodic_memory (agent_id);





drop function if exists public.episodic_search(extensions.vector, int);


create or replace function public.episodic_search(
  query_embedding extensions.vector, match_count int, p_agent_id text default null
)
returns table (id uuid, conversation_id uuid, summary text, tags text[], created_at timestamptz, distance float)
language sql stable as $$
  select e.id, e.conversation_id, e.summary, e.tags, e.created_at,
         (e.embedding <=> query_embedding) as distance
  from public.episodic_memory e
  where e.embedding is not null
    and (e.agent_id is not distinct from p_agent_id)  -- null casa null (operador); id casa id (agente)
  order by e.embedding <=> query_embedding
  limit match_count
$$;
grant execute on function public.episodic_search(extensions.vector, int, text) to service_role;


alter table public.memory_jobs drop constraint if exists memory_jobs_kind_check;
alter table public.memory_jobs add constraint memory_jobs_kind_check
  check (kind in ('reflect','rollup','reflect_task'));
