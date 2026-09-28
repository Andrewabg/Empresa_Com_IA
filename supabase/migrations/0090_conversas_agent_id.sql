-- 0090: agente corrente da conversa (aditiva). Nulo = usa o agente do canal.
alter table public.conversas_externas
  add column if not exists agent_id text references public.agents(id) on delete set null;

create index if not exists conversas_externas_agent_idx
  on public.conversas_externas (agent_id) where agent_id is not null;
