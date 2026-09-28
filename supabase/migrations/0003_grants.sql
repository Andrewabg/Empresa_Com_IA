
revoke usage on schema public from anon, authenticated;
grant usage on schema public to service_role;

grant all on table public.sync_state to service_role;
grant all on table public.notes to service_role;
grant all on table public.note_chunks to service_role;
grant all on table public.edges to service_role;
grant all on table public.memory_candidates to service_role;

grant execute on function public.increment_access(text) to service_role;
grant execute on function public.hybrid_search(text, extensions.vector, int, float, float, int) to service_role;


grant usage, select on all sequences in schema public to service_role;
