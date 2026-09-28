-- 0097_base_conhecimento_chunks.sql — pedacos indexados de UMA entrada da base murada.
-- Expand-only: a tabela e nova, a RPC troca de corpo mantendo a MESMA assinatura e as
-- MESMAS colunas de retorno (o container velho segue chamando e recebendo o de sempre;
-- ele so nao escreve chunk nenhum, e entrada sem chunk continua achavel pelo vetor dela).

create table if not exists public.base_conhecimento_chunks (
  id         uuid primary key default gen_random_uuid(),
  entrada_id uuid not null references public.base_conhecimento(id) on delete cascade,
  ordem      integer not null,
  texto      text not null,
  embedding  extensions.vector(1536),
  created_at timestamptz not null default now(),
  unique (entrada_id, ordem)
);

-- Sem coluna `agent_id` aqui de proposito: a muralha por agente e a da ENTRADA, e o
-- escopo sai do join com ela. Denormalizar o dono criaria uma segunda fonte de verdade
-- que envelhece quando o operador troca o agente da entrada no painel.
create index if not exists base_chunks_entrada_idx
  on public.base_conhecimento_chunks (entrada_id);

alter table public.base_conhecimento_chunks enable row level security;
grant all on table public.base_conhecimento_chunks to service_role;

-- Busca: casa no CHUNK (recall) e devolve a ENTRADA (contexto).
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
  ),
  chk_raw as (
    select c.entrada_id, (c.embedding <=> query_embedding) as dist
    from public.base_conhecimento_chunks c
    join escopo e on e.id = c.entrada_id
    where c.embedding is not null
    order by c.embedding <=> query_embedding limit greatest(match_count * 4, 20)
  ),
  chk as (
    select entrada_id as id, min(dist) as dist,
           row_number() over (order by min(dist)) as rank
    from chk_raw group by entrada_id
  )
  select e.id, e.titulo, e.conteudo, e.tipo,
         (coalesce(1.0/(60+vec.rank), 0.0)
          + coalesce(1.0/(60+txt.rank), 0.0)
          + coalesce(1.0/(60+chk.rank), 0.0))::float as score,
         -- O MELHOR entre a entrada inteira e o pedaco mais proximo. O consumidor usa
         -- isto como corte de relevancia: manter so a similaridade da entrada inteira
         -- descartaria justamente o caso que esta tabela existe para resolver — a
         -- politica longa cujo paragrafo certo responde a pergunta e o resto dilui.
         greatest(
           case when e.embedding is null then null else (1 - (e.embedding <=> query_embedding)) end,
           case when chk.dist is null then null else (1 - chk.dist) end
         )::float as similarity
  from escopo e
  left join vec on vec.id = e.id
  left join txt on txt.id = e.id
  left join chk on chk.id = e.id
  where vec.id is not null or txt.id is not null or chk.id is not null
  order by score desc limit match_count
$$;

grant execute on function public.base_conhecimento_search(extensions.vector(1536), text, int, text, text) to service_role;

-- Cursor do backfill: entradas longas que ainda nao tem pedaco nenhum. Auto-avanca (a
-- linha sai do conjunto assim que ganha chunks), entao nao precisa de keyset.
create or replace function public.base_conhecimento_sem_chunk(
  p_limit     int default 50,
  p_min_chars int default 1200
) returns table (id uuid, titulo text, conteudo text)
language sql stable as $$
  select b.id, b.titulo, b.conteudo
  from public.base_conhecimento b
  where length(b.conteudo) >= p_min_chars
    and not exists (select 1 from public.base_conhecimento_chunks c where c.entrada_id = b.id)
  order by b.id
  limit p_limit
$$;

grant execute on function public.base_conhecimento_sem_chunk(int, int) to service_role;
