







































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
with full_text as (
  select note_id, chunk_index, content,
    row_number() over (order by ts_rank_cd(fts_pt, websearch_to_tsquery('portuguese', query_text)) desc) as rank_ix
  from note_chunks
  where fts_pt @@ websearch_to_tsquery('portuguese', query_text)
  limit least(match_count, 30) * 2
),
semantic as (
  select note_id, chunk_index, content,
    row_number() over (order by embedding <=> query_embedding) as rank_ix
  from note_chunks
  where embedding is not null
  order by embedding <=> query_embedding
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
