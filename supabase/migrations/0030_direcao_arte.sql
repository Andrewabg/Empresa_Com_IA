

alter table public.brand_memory
  add column if not exists direcao_arte jsonb not null default '{}'::jsonb;
