


create table if not exists public.campanhas (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid not null references auth.users(id) on delete cascade,
  brand_id    uuid not null references public.brands(id) on delete cascade,
  agent_id    text not null,               
  nome        text not null,
  brief       jsonb not null default '{}'::jsonb,
  big_idea    text not null default '',
  
  
  
  plano       jsonb not null default '[]'::jsonb,
  status      text not null default 'planejada'
              check (status in ('rascunho','planejada','em_producao','concluida','arquivada')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists campanhas_brand_idx on public.campanhas (operator_id, brand_id, created_at desc);
alter table public.campanhas enable row level security;
grant all on table public.campanhas to service_role;






create or replace function public.set_plano_item(p_id uuid, p_index int, p_patch jsonb)
returns public.campanhas
language sql
security definer
set search_path = public
as $$
  update public.campanhas
  set plano = jsonb_set(plano, array[p_index::text], coalesce(plano->p_index, '{}'::jsonb) || p_patch, true),
      updated_at = now()
  where id = p_id
  returning *;
$$;
grant execute on function public.set_plano_item(uuid, int, jsonb) to service_role;


alter table public.pecas add column if not exists campanha_id uuid references public.campanhas(id) on delete set null;
create index if not exists pecas_campanha_idx on public.pecas (campanha_id);



alter table public.tasks add column if not exists operator_id uuid;   
alter table public.tasks add column if not exists campanha_id uuid;   
alter table public.tasks add column if not exists plano_index integer;
