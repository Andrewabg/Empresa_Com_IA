-- 0087 — hybrid_search: o OR ganha PISO DE COBERTURA (min-should-match 2).
--
-- A 0085 trocou o AND por OR e o eval de recall reprovou: MRR 0.925 -> 0.843. A causa e
-- estrutural, nao de ajuste fino. O RRF vota por POSICAO: com AND o braco FTS nao casava
-- nada e simplesmente nao votava; com OR ele passou a devolver dezenas de chunks e o
-- primeiro deles SEMPRE leva 1/(k+1), mesmo quando so compartilha UMA palavra comum com a
-- pergunta. Um voto forte vindo de um casamento fraco desloca o resultado certo pra baixo.
--
-- O piso e o `min_should_match` classico da busca lexical: pergunta com 2+ termos exige que
-- o chunk case pelo menos DOIS. Ele recupera as duas pontas de uma vez. Quando todo mundo
-- casa so um termo (o caso da pergunta natural longa), o braco fica vazio e o hibrido volta
-- a ser exatamente o que era antes da 0085 — nada regride. Quando existe chunk cobrindo o
-- assunto de verdade, ele entra, que era o ganho que a 0085 queria.
--
-- A cobertura e contada SO no topo do ranking (`limit ... * 6` antes da contagem): a
-- subconsulta por termo roda por linha, e sem esse teto ela varreria todo chunk que casasse
-- uma palavra comum — custo por busca, no caminho da conversa.
--
-- Pergunta com negacao ou frase entre aspas mantem o comportamento da 0085 (o texto da
-- tsquery nao e uma lista de termos separada por `|`, entao a lista sai com 1 elemento e o
-- piso vira 1, ou seja, inativo).
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
    when websearch_to_tsquery('portuguese', query_text)::text ~ '!|<->'
      then websearch_to_tsquery('portuguese', query_text)
    else replace(websearch_to_tsquery('portuguese', query_text)::text, '&', '|')::tsquery
  end as tsq
),
lex as (
  select array(
    select btrim(t, '''')
    from unnest(string_to_array((select tsq from q)::text, ' | ')) as t
    where btrim(t, '''') <> ''
  ) as termos
),
ft_topo as (
  select note_id, chunk_index, content, fts_pt,
    ts_rank_cd(fts_pt, (select tsq from q)) as r
  from note_chunks
  where (select tsq from q) is not null
    and fts_pt @@ (select tsq from q)
  order by r desc, note_id, chunk_index
  limit least(match_count, 30) * 6
),
full_text as (
  select note_id, chunk_index, content,
    row_number() over (order by r desc, note_id, chunk_index) as rank_ix
  from ft_topo
  -- Piso INATIVO quando nao ha lista de termos com que medir cobertura: pergunta de uma
  -- palavra so, ou o ramo de fallback (negacao/frase), cujo texto de tsquery nao e uma
  -- lista separada por `|`. Nesses casos o comportamento e o da 0085, intacto.
  where (select cardinality(termos) from lex) < 2
     or (
       select count(*) from unnest((select termos from lex)) as termo
       where fts_pt @@ plainto_tsquery('simple', termo)
     ) >= 2
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
