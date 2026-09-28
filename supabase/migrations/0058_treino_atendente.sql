


create table if not exists treino_casos (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null references agents(id) on delete cascade,
  canal_id      uuid,
  conversa_id   uuid,
  mensagem_id   uuid,
  origem        text not null check (origem in ('marcado','escalacao','auto','cliente')),
  estimulo      jsonb not null,                 
  resposta_dada text,
  sinal         text not null default '',
  status        text not null default 'aberto' check (status in ('aberto','corrigido','ignorado')),
  criterio      text,                           
  estavel       boolean not null default true,  
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  corrigido_at  timestamptz
);
create index if not exists treino_casos_agent_status_idx on treino_casos(agent_id, status);

create index if not exists treino_casos_testes_idx on treino_casos(agent_id) where criterio is not null and status = 'corrigido';

create table if not exists treino_correcoes (
  id         uuid primary key default gen_random_uuid(),
  caso_id    uuid not null references treino_casos(id) on delete cascade,
  agent_id   text not null references agents(id) on delete cascade,
  gaveta     text not null check (gaveta in ('base','diretriz','persona')),
  ref_tabela text,
  ref_id     text,                              
  conteudo   text not null,
  ativo      boolean not null default true,     
  created_at timestamptz not null default now()
);
create index if not exists treino_correcoes_caso_idx on treino_correcoes(caso_id);
create index if not exists treino_correcoes_agent_ativo_idx on treino_correcoes(agent_id, ativo);

create table if not exists atendente_persona (
  agent_id   text primary key references agents(id) on delete cascade,
  campos     jsonb not null default '{}'::jsonb,  
  updated_at timestamptz not null default now()
);

alter table treino_casos     enable row level security;
alter table treino_correcoes enable row level security;
alter table atendente_persona enable row level security;



create policy treino_casos_operator     on treino_casos     for all using (public.is_operator()) with check (public.is_operator());
create policy treino_correcoes_operator on treino_correcoes for all using (public.is_operator()) with check (public.is_operator());
create policy atendente_persona_operator on atendente_persona for all using (public.is_operator()) with check (public.is_operator());


grant all on table public.treino_casos      to service_role;
grant all on table public.treino_correcoes  to service_role;
grant all on table public.atendente_persona to service_role;
