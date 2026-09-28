-- 0104: a busca no transcrito deixa de devolver os avisos que o PRÓPRIO sistema escreveu.
--
-- Quando um turno estoura o prazo, o produto grava na conversa um aviso em nome do agente e o
-- marca em `messages.tool_payload->socorro`. As RPCs da 0101 não projetavam essa coluna, então a
-- jusante delas não havia como distinguir "o agente disse" de "nós avisamos por ele": o aviso
-- entrava no recall e voltava ao prompt citado como fala do agente.
--
-- `messages_search` passa a EXCLUIR essas linhas (um aviso nosso nunca é a resposta de "o que a
-- gente conversou"). `messages_window` as mantém, porque é a vizinhança de um acerto e um buraco
-- ali muda o sentido do que veio antes e depois, mas agora devolve a marca `socorro` para quem
-- monta o prompt saber o que é o quê.
--
-- Expand-only: o `drop` é da função (não de dado). A coluna nova na `messages_window` é aditiva
-- para quem lê por nome; o container da versão anterior ignora o campo extra.

drop function if exists public.messages_search(text, text, text, int, uuid, uuid[]);

create function public.messages_search(
  p_operator_id    text,
  p_agent_id       text,
  query_text       text,
  match_count      int default 6,
  p_conversation_id uuid default null,
  p_excluir_ids    uuid[] default null
) returns table (
  message_id uuid, conversation_id uuid, conversa_titulo text,
  role text, content text, created_at timestamptz, snippet text, score float
) language sql stable as $$
  with q as (select websearch_to_tsquery('portuguese', query_text) as tsq),
  escopo as (
    select c.id, c.title
    from public.conversations c
    where c.operator_id::text = p_operator_id
      and c.agent_id = p_agent_id
      and (p_conversation_id is null or c.id = p_conversation_id)
  )
  select m.id, m.conversation_id, e.title, m.role, m.content, m.created_at,
    ts_headline('portuguese', m.content, (select tsq from q),
      'MaxFragments=1, MaxWords=18, MinWords=6, StartSel=<<, StopSel=>>') as snippet,
    ts_rank(m.fts_pt, (select tsq from q))::float as score
  from public.messages m
  join escopo e on e.id = m.conversation_id
  where m.fts_pt @@ (select tsq from q)
    and m.role in ('user','assistant')
    and coalesce(m.content, '') <> ''
    and coalesce((m.tool_payload->>'socorro')::boolean, false) = false
    and (p_excluir_ids is null or not (m.id = any(p_excluir_ids)))
  order by score desc, m.created_at desc
  limit match_count
$$;

revoke all on function public.messages_search(text, text, text, int, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.messages_search(text, text, text, int, uuid, uuid[]) to service_role;
alter function public.messages_search(text, text, text, int, uuid, uuid[]) set search_path = public;

drop function if exists public.messages_window(text, text, uuid, int);

create function public.messages_window(
  p_operator_id text,
  p_agent_id    text,
  p_message_id  uuid,
  p_radius      int default 2
) returns table (
  message_id uuid, conversation_id uuid, role text, content text,
  created_at timestamptz, e_o_hit boolean, socorro boolean
) language sql stable as $$
  with alvo as (
    select m.id, m.conversation_id, m.created_at
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = p_message_id
      and c.operator_id::text = p_operator_id
      and c.agent_id = p_agent_id
  ),
  antes as (
    select m.id, m.conversation_id, m.role, m.content, m.created_at,
      coalesce((m.tool_payload->>'socorro')::boolean, false) as socorro
    from public.messages m, alvo a
    where m.conversation_id = a.conversation_id
      and m.created_at < a.created_at
      and m.role in ('user','assistant')
      and coalesce(m.content,'') <> ''
    order by m.created_at desc
    limit p_radius
  ),
  depois as (
    select m.id, m.conversation_id, m.role, m.content, m.created_at,
      coalesce((m.tool_payload->>'socorro')::boolean, false) as socorro
    from public.messages m, alvo a
    where m.conversation_id = a.conversation_id
      and m.created_at > a.created_at
      and m.role in ('user','assistant')
      and coalesce(m.content,'') <> ''
    order by m.created_at asc
    limit p_radius
  )
  select id, conversation_id, role, content, created_at, false, socorro from antes
  union all
  select m.id, m.conversation_id, m.role, m.content, m.created_at, true,
    coalesce((m.tool_payload->>'socorro')::boolean, false)
    from public.messages m join alvo a on a.id = m.id
  union all
  select id, conversation_id, role, content, created_at, false, socorro from depois
  order by created_at asc
$$;

revoke all on function public.messages_window(text, text, uuid, int) from public, anon, authenticated;
grant execute on function public.messages_window(text, text, uuid, int) to service_role;
alter function public.messages_window(text, text, uuid, int) set search_path = public;
