
alter table public.conversations
  add column agent_id text references public.agents(id) on delete set null;




update public.conversations set agent_id = 'jarvis'
  where agent_id is null and exists (select 1 from public.agents where id = 'jarvis');

create index conversations_operator_agent_idx
  on public.conversations (operator_id, agent_id);
