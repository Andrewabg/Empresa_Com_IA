-- 0085 — hybrid_search: o lado FTS passa a casar por OR ranqueado.
--
-- `websearch_to_tsquery` monta um AND de todos os lexemas: uma pergunta natural
-- ("qual e o ticket medio da consultoria que a gente vende?") so casava um chunk que
-- contivesse TODOS os termos, e nenhum chunk contem. Medido vivo: 0 hits. O braco FTS
-- do hibrido estava inerte, e o RRF virava busca vetorial pura com peso desperdicado.
--
-- Agora o AND vira OR (troca do operador no texto ja normalizado da tsquery) e a ordem
-- fica com o `ts_rank_cd`, que premia chunk com mais termos e mais proximos. Query com
-- negacao (`!`) mantem o AND: com OR, `a | !b` casaria quase tudo.
--
-- Corrige tambem o LIMIT sem ORDER BY das duas CTEs: a janela era calculada sobre todas
-- as linhas, mas o LIMIT escolhia linhas ARBITRARIAS. Com AND casando pouca coisa passava
-- despercebido; com OR casando muito, o pool ia virar sorteio. Desempate por
-- (note_id, chunk_index) para o resultado ser reproduzivel entre runs do eval.
--
-- create or replace, mesma assinatura: expand-only, sem DROP.
create or replace function hybrid_search(
  query_text text,
  query_embedding extensions.vector(1536),
  match_count int default 10,
  full_text_weight float default 1,
  semantic_weight float default 0.9,
  rrf_k int default 6
)
returns table (note_id text, chunk_index int, content text, score float)
language sql stable
as $$
with q as (
  select case
    when websearch_to_tsquery('portuguese', query_text)::text = '' then null
    when websearch_to_tsquery('portuguese', query_text)::text like '%!%'
      then websearch_to_tsquery('portuguese', query_text)
    else replace(websearch_to_tsquery('portuguese', query_text)::text, '&', '|')::tsquery
  end as tsq
),
full_text as (
  select note_id, chunk_index, content,
    row_number() over (
      order by ts_rank_cd(fts_pt, (select tsq from q)) desc, note_id, chunk_index
    ) as rank_ix
  from note_chunks
  where (select tsq from q) is not null
    and fts_pt @@ (select tsq from q)
  order by rank_ix
  limit least(match_count, 30) * 2
),
semantic as (
  select note_id, chunk_index, content,
    row_number() over (order by embedding <=> query_embedding, note_id, chunk_index) as rank_ix
  from note_chunks
  where embedding is not null
  order by embedding <=> query_embedding, note_id, chunk_index
  limit least(match_count, 30) * 2
)
select
  coalesce(full_text.note_id, semantic.note_id) as note_id,
  coalesce(full_text.chunk_index, semantic.chunk_index) as chunk_index,
  coalesce(full_text.content, semantic.content) as content,
  (coalesce(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight +
   coalesce(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight)::float as score
from full_text
full outer join semantic
  on full_text.note_id = semantic.note_id and full_text.chunk_index = semantic.chunk_index
order by score desc
limit least(match_count, 30)
$$;
