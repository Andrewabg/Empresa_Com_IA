

alter table public.pecas add column if not exists ad_id text;
alter table public.pecas add column if not exists ad_perf jsonb;
