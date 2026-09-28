-- 0065_base_conhecimento_similarity.sql — adiciona `similarity` (cosseno) ao retorno da RPC
-- da base murada do atendente, pra o cutoff de relevancia (Fatia 0). Expand-only: a coluna
-- extra e ignorada pelo container velho (backward-compat). Espelha a estrutura da 0059.
drop function if exists public.base_conhecimento_search(extensions.vector(1536), text, int, text, text);

create function public.base_conhecimento_search(
  query_embedding extensions.vector(1536),
  query_text      text,
  match_count     int default 5,
  p_agent_id      text default null,
  p_tipo          text default null
) returns table (id uuid, titulo text, conteudo text, tipo text, score float, similarity float)
language sql stable as $$
  with escopo as (
    select * from public.base_conhecimento
    where enabled and (agent_id is null or agent_id = p_agent_id) and (p_tipo is null or tipo = p_tipo)
  ),
  vec as (
    select id, row_number() over (order by embedding <=> query_embedding) as rank
    from escopo where embedding is not null
    order by embedding <=> query_embedding limit greatest(match_count * 2, 10)
  ),
  txt as (
    select id, row_number() over (order by ts_rank(fts, websearch_to_tsquery('portuguese', query_text)) desc) as rank
    from escopo where fts @@ websearch_to_tsquery('portuguese', query_text)
    limit greatest(match_count * 2, 10)
  )
  select e.id, e.titulo, e.conteudo, e.tipo,
         (coalesce(1.0/(60+vec.rank), 0.0) + coalesce(1.0/(60+txt.rank), 0.0))::float as score,
         case when e.embedding is null then null else (1 - (e.embedding <=> query_embedding)) end::float as similarity
  from escopo e
  left join vec on vec.id = e.id
  left join txt on txt.id = e.id
  where vec.id is not null or txt.id is not null
  order by score desc limit match_count
$$;

grant execute on function public.base_conhecimento_search(extensions.vector(1536), text, int, text, text) to service_role;
