-- 0133 -- hybrid_search_scored: particiona o braco semantico por nota ANTES do corte global.
--
-- create or replace sobre a MESMA assinatura/retorno da 0131 (nao e funcao nova, so corrige o
-- corpo dela). `row_number() over (partition by note_id order by distancia, chunk_index)` corta
-- o excedente por nota (top 3) antes do `limit` global.
create or replace function hybrid_search_scored(
  query_text text,
  query_embedding extensions.vector(1536),
  match_count int default 10,
  full_text_weight float default 1,
  semantic_weight float default 0.9,
  rrf_k int default 6
)
returns table (note_id text, chunk_index int, content text, score float, distancia float)
language sql stable
as $$
with q as (
  select websearch_to_tsquery('portuguese', query_text) as tsq
),
full_text as (
  select note_id, chunk_index, content,
    row_number() over (
      order by ts_rank_cd(fts_pt, (select tsq from q)) desc, note_id, chunk_index
    ) as rank_ix
  from note_chunks
  where fts_pt @@ (select tsq from q)
  order by rank_ix
  limit least(match_count, 30) * 2
),
semantic_por_nota as (
  select note_id, chunk_index, content, embedding,
    row_number() over (
      partition by note_id order by embedding <=> query_embedding, chunk_index
    ) as rank_no_documento
  from note_chunks
  where embedding is not null
),
semantic as (
  select note_id, chunk_index, content,
    (embedding <=> query_embedding)::float as distancia,
    row_number() over (order by embedding <=> query_embedding, note_id, chunk_index) as rank_ix
  from semantic_por_nota
  where rank_no_documento <= 3
  order by embedding <=> query_embedding, note_id, chunk_index
  limit least(match_count, 30) * 2
)
select
  coalesce(full_text.note_id, semantic.note_id) as note_id,
  coalesce(full_text.chunk_index, semantic.chunk_index) as chunk_index,
  coalesce(full_text.content, semantic.content) as content,
  (coalesce(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight +
   coalesce(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight)::float as score,
  semantic.distancia as distancia
from full_text
full outer join semantic
  on full_text.note_id = semantic.note_id and full_text.chunk_index = semantic.chunk_index
order by score desc
limit least(match_count, 30)
$$;
