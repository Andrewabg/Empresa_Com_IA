-- 0088 — hybrid_search volta a casar por AND. A 0085/0087 foram uma hipotese REFUTADA.
--
-- A hipotese: `websearch_to_tsquery` monta um AND de todos os lexemas, entao uma pergunta
-- natural nao casava chunk nenhum e o braco FTS do hibrido estava inerte — metade do RRF sem
-- votar. Trocar por OR daria voz a ela.
--
-- O que a regua disse (eval de recall, chave real, 34 casos):
--   AND (antes)                     MRR 0.925
--   OR puro (0085)                  MRR 0.843
--   OR + piso de cobertura (0087)   MRR 0.834
--   OR + piso + peso 0.4            MRR 0.847
-- Nenhuma variante chegou perto, e nenhuma mostrou ganho em lugar nenhum: `needle` — o tipo
-- que mais dependeria de casamento lexical — ficou parado em 0.844. Quem mais sofreu foi
-- `armadilha_oca` (0.750 -> 0.583), e o motivo e estrutural: a nota OCA repete as palavras da
-- pergunta sem responder nada, entao o sinal lexical e o PIOR juiz possivel justamente para a
-- armadilha que o eval existe pra medir. O RRF ainda por cima vota por POSICAO: o primeiro
-- colocado do braco FTS leva 1/(k+1) mesmo quando o casamento e fraco.
--
-- Fica o registro para nao refazer: o braco FTS so vale a pena com um sinal de RARIDADE do
-- termo (nome proprio, numero, sigla, CNPJ), nao com cobertura nem com peso menor. Enquanto
-- esse sinal nao existir, AND e a escolha certa — inerte na pergunta longa, mas sem custo.
--
-- O QUE FICA da 0085 (bug real, independente da hipotese): as duas CTEs calculavam a janela
-- sobre todas as linhas e faziam LIMIT SEM ORDER BY, entao o pool era escolhido
-- ARBITRARIAMENTE em vez de por relevancia. Com AND casando pouca coisa isso quase nunca
-- mordia, mas era sorteio por construcao. Desempate por (note_id, chunk_index) deixa o
-- resultado reproduzivel entre runs do eval.
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
