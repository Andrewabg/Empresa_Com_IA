-- 0084 — episodic_search: contratado enxerga o operador-wide (null) alem do proprio.
-- Antes casava agent_id ESTRITO (is not distinct from) — contratado so via o proprio
-- episodico. Agora usa o mesmo OR da base do atendente (0059): operador-wide OU do agente.
-- Primario (p_agent_id null) segue vendo so as linhas null (inalterado). Contratado
-- (p_agent_id id) ve null + id — NUNCA outro contratado. create or replace reseta
-- atributos nao-declarados, entao re-inclui search_path (0075) e re-grant (idempotente).

create or replace function public.episodic_search(
  query_embedding extensions.vector, match_count int, p_agent_id text default null
)
returns table (id uuid, conversation_id uuid, summary text, tags text[], created_at timestamptz, distance float)
language sql stable
set search_path = public, extensions
as $$
  select e.id, e.conversation_id, e.summary, e.tags, e.created_at,
         (e.embedding <=> query_embedding) as distance
  from public.episodic_memory e
  where e.embedding is not null
    and (e.agent_id is null or e.agent_id = p_agent_id)  -- operador-wide (null) OU do agente
  order by e.embedding <=> query_embedding
  limit match_count
$$;

revoke execute on function public.episodic_search(vector, integer, text) from public, anon, authenticated;
grant  execute on function public.episodic_search(vector, integer, text) to service_role;
