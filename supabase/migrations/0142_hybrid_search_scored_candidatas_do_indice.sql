-- 0142 -- hybrid_search_scored: o braco semantico volta a passar pelo indice HNSW.
--
-- create or replace sobre a MESMA assinatura/retorno da 0131/0133. O que muda e a ORDEM das
-- duas operacoes do braco semantico. A 0133 aplicava `row_number() over (partition by note_id
-- ...)` direto sobre `note_chunks`: uma window sem limite nao pode usar o
-- `note_chunks_embedding_idx` (HNSW, 0001), entao toda busca calculava a distancia de cada
-- chunk do acervo. Aqui as candidatas saem primeiro pela forma que o indice serve
-- (`order by embedding <=> query_embedding limit N`) e o teto de 3 chunks por nota e aplicado
-- DEPOIS, sobre esse conjunto ja reduzido.
--
-- N = 500 (`TETO_CANDIDATAS`): o pool do braco semantico e `least(match_count,30)*2`, no
-- maximo 60 linhas, e o teto de 3 por nota exige 20 notas distintas para enche-lo. 500 deixa
-- 440 linhas de folga para um documento grande dominar a vizinhanca e ainda sobrar nota.
--
-- `set hnsw.ef_search`: o indice HNSW devolve no maximo `ef_search` linhas por varredura
-- (default 40) - sem elevar isso o `limit 500` seria decorativo e a poda por nota receberia
-- 40 candidatas. O `select` abaixo carrega a biblioteca do pgvector nesta sessao; sem ela o
-- parametro do `set` e desconhecido e o CREATE FUNCTION e recusado.
select ('[1,0]'::extensions.vector(2) <=> '[0,1]'::extensions.vector(2)) as pgvector_carregado;

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
set hnsw.ef_search = '500'
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
semantic_candidatas as (
  select note_id, chunk_index, content, embedding
  from note_chunks
  where embedding is not null
  order by embedding <=> query_embedding, note_id, chunk_index
  limit 500
),
semantic_por_nota as (
  select note_id, chunk_index, content, embedding,
    row_number() over (
      partition by note_id order by embedding <=> query_embedding, chunk_index
    ) as rank_no_documento
  from semantic_candidatas
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
