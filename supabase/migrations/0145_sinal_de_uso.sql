-- 0145: sinal de uso da memória + origem do episódico (aditiva).

alter table public.episodic_memory
  add column if not exists origin_class text
    check (origin_class in ('dono','agente','terceiro','sistema'));

create index if not exists episodic_origin_idx
  on public.episodic_memory (origin_class, created_at);

create table if not exists public.uso_da_memoria (
  alvo_tipo     text not null check (alvo_tipo in ('nota','episodic')),
  alvo_id       text not null,
  dia           date not null,
  consulta_hash text not null,
  registrado_em timestamptz not null default now(),
  primary key (alvo_tipo, alvo_id, dia, consulta_hash)
);

create index if not exists uso_da_memoria_alvo_idx
  on public.uso_da_memoria (alvo_tipo, alvo_id);
create index if not exists uso_da_memoria_dia_idx
  on public.uso_da_memoria (dia);

alter table public.uso_da_memoria enable row level security;
grant all on table public.uso_da_memoria to service_role;

-- Agregação do sinal por episódico. Os limiares e a allow-list de origem chegam como
-- PARÂMETRO: quem os define é `src/lib/memory/promocaoPorUso.ts`, e repeti-los aqui criaria
-- uma segunda fonte de verdade que apodrece em silêncio.
create or replace function public.uso_agregado_do_episodico(
  p_origens       text[],
  p_desde         timestamptz,
  p_min_sinais    int,
  p_min_consultas int,
  p_min_dias      int,
  p_limite        int
)
returns table (
  alvo_id         text,
  sinais          bigint,
  consultas_unicas bigint,
  dias_distintos  bigint,
  ultimo_dia      date,
  criado_em       timestamptz,
  resumo          text
)
language sql stable security definer set search_path = public as $$
  with usos as (
    select u.alvo_id, u.consulta_hash, u.dia
      from public.uso_da_memoria u
     where u.alvo_tipo = 'episodic'
  )
  select u.alvo_id,
         count(*)                        as sinais,
         count(distinct u.consulta_hash) as consultas_unicas,
         count(distinct u.dia)           as dias_distintos,
         max(u.dia)                      as ultimo_dia,
         e.created_at                    as criado_em,
         e.summary                       as resumo
    from usos u
    join public.episodic_memory e on e.id::text = u.alvo_id
   where e.origin_class = any(p_origens)
     and e.created_at >= p_desde
   group by u.alvo_id, e.created_at, e.summary
  having count(*) >= p_min_sinais
     and count(distinct u.consulta_hash) >= p_min_consultas
     and count(distinct u.dia) >= p_min_dias
   order by count(distinct u.consulta_hash) * count(distinct u.dia) desc, u.alvo_id
   limit p_limite;
$$;

revoke execute on function public.uso_agregado_do_episodico(text[], timestamptz, int, int, int, int)
  from public, anon, authenticated;
grant execute on function public.uso_agregado_do_episodico(text[], timestamptz, int, int, int, int)
  to service_role;
