




create table public.artifacts (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  task_id         uuid references public.tasks(id) on delete set null,
  agent_id        text not null,
  kind            text not null check (kind in ('documento','html','codigo','dados','imagem')),
  title           text not null,
  content         text,                 
  storage_ref     text,                 
  summary         text,
  status          text not null default 'draft',
  version         int  not null default 1,
  parent_id       uuid references public.artifacts(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index artifacts_conversation_idx on public.artifacts (conversation_id, created_at desc);
create index artifacts_task_idx on public.artifacts (task_id);

alter table public.artifacts enable row level security;
grant all on table public.artifacts to service_role;





insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do nothing;
