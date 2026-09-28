




update public.hiring_sessions s set status = 'abandonado', updated_at = now()
where status = 'em_andamento'
  and id <> (
    select id from public.hiring_sessions
    where status = 'em_andamento'
    order by updated_at desc
    limit 1
  );




create unique index if not exists hiring_sessions_one_viva
  on public.hiring_sessions (status)
  where status = 'em_andamento';


alter table public.hiring_sessions
  add column if not exists spec_gen_count int not null default 0;
