-- 0101: busca no transcript bruto (a rede embaixo do resumo).
-- Espelha a conversations_search da 0078 e reusa o MESMO indice (messages_fts_pt_idx,
-- GIN sobre messages.fts_pt). Sem coluna nova, sem indice novo. Aditiva.
--
-- messages_search devolve MENSAGEM (nao conversa) e aceita foco numa conversa.
-- messages_window devolve as vizinhas de um hit: o trecho de 14 palavras nao serve
-- sozinho, e a janela ao redor e o que da sentido a ele.

create or replace function public.messages_search(
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
    and (p_excluir_ids is null or not (m.id = any(p_excluir_ids)))
  order by score desc, m.created_at desc
  limit match_count
$$;

revoke all on function public.messages_search(text, text, text, int, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.messages_search(text, text, text, int, uuid, uuid[]) to service_role;
alter function public.messages_search(text, text, text, int, uuid, uuid[]) set search_path = public;

-- Vizinhanca de um hit, na MESMA conversa e dentro do MESMO escopo (operador+agente).
-- O escopo e re-checado aqui de proposito: quem tem o id de uma mensagem nao ganha por
-- isso o direito de ler a conversa de outro cargo.
create or replace function public.messages_window(
  p_operator_id text,
  p_agent_id    text,
  p_message_id  uuid,
  p_radius      int default 2
) returns table (
  message_id uuid, conversation_id uuid, role text, content text,
  created_at timestamptz, e_o_hit boolean
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
    select m.id, m.conversation_id, m.role, m.content, m.created_at
    from public.messages m, alvo a
    where m.conversation_id = a.conversation_id
      and m.created_at < a.created_at
      and m.role in ('user','assistant')
      and coalesce(m.content,'') <> ''
    order by m.created_at desc
    limit p_radius
  ),
  depois as (
    select m.id, m.conversation_id, m.role, m.content, m.created_at
    from public.messages m, alvo a
    where m.conversation_id = a.conversation_id
      and m.created_at > a.created_at
      and m.role in ('user','assistant')
      and coalesce(m.content,'') <> ''
    order by m.created_at asc
    limit p_radius
  )
  select id, conversation_id, role, content, created_at, false from antes
  union all
  select m.id, m.conversation_id, m.role, m.content, m.created_at, true
    from public.messages m join alvo a on a.id = m.id
  union all
  select id, conversation_id, role, content, created_at, false from depois
  order by created_at asc
$$;

revoke all on function public.messages_window(text, text, uuid, int) from public, anon, authenticated;
grant execute on function public.messages_window(text, text, uuid, int) to service_role;
alter function public.messages_window(text, text, uuid, int) set search_path = public;
