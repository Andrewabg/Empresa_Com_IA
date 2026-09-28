















do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agents'
  ) then
    alter publication supabase_realtime add table agents;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'canais'
  ) then
    alter publication supabase_realtime add table canais;
  end if;
end $$;






alter table public.agents replica identity full;
alter table public.canais replica identity full;




drop policy if exists "operator reads agents" on public.agents;
create policy "operator reads agents" on public.agents
  for select to authenticated using (public.is_operator());

drop policy if exists "operator reads canais" on public.canais;
create policy "operator reads canais" on public.canais
  for select to authenticated using (public.is_operator());
