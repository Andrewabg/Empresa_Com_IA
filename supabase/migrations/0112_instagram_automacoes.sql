-- 0112: automacoes de Instagram, seus passos, os runs e a fila (aditiva).

create table if not exists public.ig_automacoes (
  id                     uuid primary key default gen_random_uuid(),
  canal_id               uuid not null references public.canais(id) on delete cascade,
  agent_id               text not null references public.agents(id) on delete cascade,
  nome                   text not null,
  gatilho                text not null default 'comentario'
                           check (gatilho in ('comentario','story','palavra_no_direct')),
  midia_id               text,
  midia_permalink        text,
  midia_thumb_url        text,
  story_id               text,
  permalinks_adicionais  text[] not null default '{}',
  midia_ids_adicionais   text[] not null default '{}',
  palavras               text[] not null default '{}',
  modo_casamento         text not null default 'contem'
                           check (modo_casamento in ('contem','exata','exata_normalizada')),
  resposta_publica       boolean not null default false,
  resposta_publica_texto text,
  status                 text not null default 'rascunho'
                           check (status in ('rascunho','ativa','expirada','arquivada')),
  expira_em              timestamptz,
  disparos               integer not null default 0,
  dms_enviadas           integer not null default 0,
  respostas_publicas     integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint ig_automacoes_comentario_exige_midia
    check (gatilho <> 'comentario' or midia_id is not null),
  constraint ig_automacoes_story_exige_story
    check (gatilho <> 'story' or story_id is not null)
);

create index if not exists ig_automacoes_ativas_idx
  on public.ig_automacoes (canal_id, midia_id) where status = 'ativa';
create index if not exists ig_automacoes_expira_idx
  on public.ig_automacoes (expira_em) where status = 'ativa' and expira_em is not null;
create index if not exists ig_automacoes_agent_idx on public.ig_automacoes (agent_id);

create table if not exists public.ig_automacao_passos (
  id             uuid primary key default gen_random_uuid(),
  automacao_id   uuid not null references public.ig_automacoes(id) on delete cascade,
  posicao        smallint not null check (posicao >= 1),
  texto          text,
  imagem_path    text,
  botoes         jsonb not null default '[]'::jsonb,
  atraso_s       integer not null default 0 check (atraso_s >= 0 and atraso_s <= 300),
  created_at     timestamptz not null default now(),
  unique (automacao_id, posicao),
  constraint ig_passo_nao_vazio check (texto is not null or imagem_path is not null),
  constraint ig_passo_max_3_botoes check (jsonb_array_length(botoes) <= 3)
);

create table if not exists public.ig_automacao_runs (
  id             uuid primary key default gen_random_uuid(),
  automacao_id   uuid not null references public.ig_automacoes(id) on delete cascade,
  canal_id       uuid not null references public.canais(id) on delete cascade,
  origem         text not null check (origem in ('comentario','direct')),
  origem_id      text not null,
  ig_user_id     text not null,
  ig_username    text,
  texto_origem   text,
  palavra_casada text,
  status         text not null default 'pendente'
                   check (status in ('pendente','enviando','concluido','falhou','pulado_repetido')),
  erro_codigo    text,
  erro_mensagem  text,
  created_at     timestamptz not null default now(),
  concluido_em   timestamptz,
  unique (automacao_id, ig_user_id, origem_id)
);

create index if not exists ig_runs_automacao_idx
  on public.ig_automacao_runs (automacao_id, created_at desc);

create table if not exists public.ig_jobs (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.ig_automacao_runs(id) on delete cascade,
  passo        smallint not null default 0,
  status       text not null default 'queued'
                 check (status in ('queued','running','done','failed','dead')),
  nao_antes    timestamptz not null default now(),
  attempts     integer not null default 0,
  max_attempts integer not null default 3,
  last_error   text,
  heartbeat_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Um job vivo por run.
create unique index if not exists ig_jobs_vivo_idx
  on public.ig_jobs (run_id) where status in ('queued','running');
create index if not exists ig_jobs_claim_idx
  on public.ig_jobs (nao_antes) where status = 'queued';
create index if not exists ig_jobs_frio_idx
  on public.ig_jobs (heartbeat_at) where status = 'running';

alter table public.ig_automacoes enable row level security;
alter table public.ig_automacao_passos enable row level security;
alter table public.ig_automacao_runs enable row level security;
alter table public.ig_jobs enable row level security;
grant all on table public.ig_automacoes to service_role;
grant all on table public.ig_automacao_passos to service_role;
grant all on table public.ig_automacao_runs to service_role;
grant all on table public.ig_jobs to service_role;

create or replace function public.ig_incrementar_contador(
  p_automacao_id uuid, p_coluna text, p_quanto integer
) returns void language plpgsql security definer
set search_path = public
as $$
begin
  if p_coluna not in ('disparos','dms_enviadas','respostas_publicas') then
    raise exception 'coluna invalida';
  end if;
  execute format('update public.ig_automacoes set %I = %I + $1, updated_at = now() where id = $2', p_coluna, p_coluna)
    using p_quanto, p_automacao_id;
end $$;
