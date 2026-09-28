



create table public.canais (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('whatsapp')),
  external_id text not null unique,          
  rotulo      text not null default '',      
  agent_id    text not null references public.agents(id) on delete restrict,
  modo        text not null default 'supervisionado' check (modo in ('supervisionado','autonomo')),
  enabled     boolean not null default true,
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.canais enable row level security; 
grant all on table public.canais to service_role;


create table public.contatos (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('whatsapp')),
  external_id text not null,                 
  nome        text not null default '',
  ficha       jsonb not null default '{"perfil":{},"aprendizados":[]}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tipo, external_id)
);
alter table public.contatos enable row level security; 
grant all on table public.contatos to service_role;


create table public.conversas_externas (
  id               uuid primary key default gen_random_uuid(),
  canal_id         uuid not null references public.canais(id) on delete cascade,
  contato_id       uuid not null references public.contatos(id) on delete cascade,
  status           text not null default 'aberta'
                   check (status in ('aberta','aguardando_humano','assumida','fechada')),
  ultima_msg_in_at timestamptz,              
  ultima_msg_at    timestamptz,
  nao_lidas        integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index conversas_externas_canal_idx on public.conversas_externas (canal_id, ultima_msg_at desc);
create unique index conversas_externas_par_aberta_idx
  on public.conversas_externas (canal_id, contato_id) where status <> 'fechada';
alter table public.conversas_externas enable row level security;
grant all on table public.conversas_externas to service_role;


create table public.mensagens_externas (
  id             uuid primary key default gen_random_uuid(),
  conversa_id    uuid not null references public.conversas_externas(id) on delete cascade,
  direcao        text not null check (direcao in ('in','out')),
  autor          text not null check (autor in ('contato','agente','operador')),
  texto          text not null default '',
  texto_rascunho text,                       
  midia          jsonb,                      
  external_id    text unique,                
  status         text not null check (status in
                   ('recebida','rascunho','enviada','entregue','lida','falhou','descartada')),
  erro           text,
  created_at     timestamptz not null default now()
);
create index mensagens_externas_conversa_idx on public.mensagens_externas (conversa_id, created_at);
alter table public.mensagens_externas enable row level security;
grant all on table public.mensagens_externas to service_role;


create table public.atendimento_jobs (
  id           uuid primary key default gen_random_uuid(),
  conversa_id  uuid not null references public.conversas_externas(id) on delete cascade,
  status       text not null default 'queued' check (status in ('queued','running','done','failed','dead')),
  nao_antes    timestamptz not null default now(),   
  attempts     integer not null default 0,
  max_attempts integer not null default 3,
  last_error   text,
  heartbeat_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index atendimento_jobs_conversa_live_idx
  on public.atendimento_jobs (conversa_id) where status in ('queued','running');

create index if not exists atendimento_jobs_queued_idx
  on public.atendimento_jobs (nao_antes)
  where status = 'queued';
alter table public.atendimento_jobs enable row level security; 
grant all on table public.atendimento_jobs to service_role;


create table public.base_conhecimento (
  id         uuid primary key default gen_random_uuid(),
  agent_id   text references public.agents(id) on delete cascade,  
  titulo     text not null,
  conteudo   text not null,
  embedding  extensions.vector(1536),
  fts        tsvector generated always as
             (to_tsvector('portuguese', coalesce(titulo,'') || ' ' || coalesce(conteudo,''))) stored,
  enabled    boolean not null default true,
  origem     text not null default 'operador' check (origem in ('operador','aprendizado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index base_conhecimento_fts_idx on public.base_conhecimento using gin (fts);
create index base_conhecimento_emb_idx on public.base_conhecimento
  using hnsw (embedding extensions.vector_cosine_ops) where (embedding is not null);
alter table public.base_conhecimento enable row level security; 
grant all on table public.base_conhecimento to service_role;





create or replace function public.base_conhecimento_search(
  query_embedding extensions.vector(1536),
  query_text      text,
  match_count     int default 5,
  p_agent_id      text default null
) returns table (id uuid, titulo text, conteudo text, score float)
language sql stable as $$
  with escopo as (
    select * from public.base_conhecimento
    where enabled and (agent_id is null or agent_id = p_agent_id)
  ),
  vec as (
    select id, row_number() over (order by embedding <=> query_embedding) as rank
    from escopo where embedding is not null
    order by embedding <=> query_embedding limit greatest(match_count * 2, 10)
  ),
  txt as (
    select id, row_number() over
      (order by ts_rank(fts, websearch_to_tsquery('portuguese', query_text)) desc) as rank
    from escopo where fts @@ websearch_to_tsquery('portuguese', query_text)
    limit greatest(match_count * 2, 10)
  )
  select e.id, e.titulo, e.conteudo,
         (coalesce(1.0/(60+vec.rank), 0.0) + coalesce(1.0/(60+txt.rank), 0.0))::float as score
  from escopo e
  left join vec on vec.id = e.id
  left join txt on txt.id = e.id
  where vec.id is not null or txt.id is not null
  order by score desc limit match_count
$$;

grant execute on function public.base_conhecimento_search(extensions.vector(1536), text, int, text) to service_role;


grant select on table public.conversas_externas to authenticated;
grant select on table public.mensagens_externas to authenticated;
create policy "authenticated read conversas" on public.conversas_externas
  for select to authenticated using (true);
create policy "authenticated read mensagens" on public.mensagens_externas
  for select to authenticated using (true);
alter publication supabase_realtime add table conversas_externas;
alter publication supabase_realtime add table mensagens_externas;


insert into storage.buckets (id, name, public)
  values ('atendimento-midia', 'atendimento-midia', false)
  on conflict (id) do nothing;
