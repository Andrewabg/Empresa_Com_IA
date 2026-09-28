-- 0078: nova conversa + historico pesquisavel.
-- FTS pt no corpo das mensagens (espelha 0050 note_chunks.fts_pt) + flag de titulo
-- provisorio + RPC de busca de threads por par (operador, agente).

alter table public.messages
  add column if not exists fts_pt tsvector
  generated always as (to_tsvector('portuguese', coalesce(content,''))) stored;
create index if not exists messages_fts_pt_idx on public.messages using gin (fts_pt);

alter table public.conversations
  add column if not exists title_provisional boolean not null default false;

create or replace function public.conversations_search(
  p_operator_id text,
  p_agent_id    text,
  query_text    text,
  match_count   int default 30,
  p_since       timestamptz default null,
  p_until       timestamptz default null
) returns table (
  id uuid, title text, updated_at timestamptz, snippet text, score float
) language sql stable as $$
  with q as (select websearch_to_tsquery('portuguese', query_text) as tsq),
  escopo as (
    select c.id, c.title, c.updated_at
    from public.conversations c
    where c.operator_id::text = p_operator_id
      and c.agent_id = p_agent_id
      and (p_since is null or c.updated_at >= p_since)
      and (p_until is null or c.updated_at <= p_until)
  ),
  msg as (
    select distinct on (m.conversation_id)
      m.conversation_id,
      ts_rank(m.fts_pt, (select tsq from q)) as rank,
      ts_headline('portuguese', m.content, (select tsq from q),
        'MaxFragments=1, MaxWords=14, MinWords=5, StartSel=<<, StopSel=>>') as snippet
    from public.messages m
    join escopo e on e.id = m.conversation_id
    where m.fts_pt @@ (select tsq from q)
    order by m.conversation_id, ts_rank(m.fts_pt, (select tsq from q)) desc
  ),
  titulo as (
    select e.id,
      ts_rank(to_tsvector('portuguese', coalesce(e.title,'')), (select tsq from q)) as rank
    from escopo e
    where to_tsvector('portuguese', coalesce(e.title,'')) @@ (select tsq from q)
  )
  select e.id, e.title, e.updated_at, msg.snippet,
         (coalesce(msg.rank,0) + coalesce(titulo.rank,0))::float as score
  from escopo e
  left join msg on msg.conversation_id = e.id
  left join titulo on titulo.id = e.id
  where msg.conversation_id is not null or titulo.id is not null
  order by score desc, e.updated_at desc
  limit match_count
$$;

-- Acesso: so service_role executa (revoke do grant PUBLIC default) + search_path fixo.
revoke all on function public.conversations_search(text, text, text, int, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.conversations_search(text, text, text, int, timestamptz, timestamptz) to service_role;
alter function public.conversations_search(text, text, text, int, timestamptz, timestamptz) set search_path = public;
