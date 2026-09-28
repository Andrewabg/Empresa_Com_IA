-- 0075_hardening_grants.sql
-- Aperta a superfície de API que o advisor de segurança do Supabase apontou.
-- Aditiva (só revoke/grant/alter em funções JÁ existentes; nada de tabela/coluna).
-- NÃO edita migrations 0001-0003 nem src/brain — só altera funções via migration nova.

-- 1. is_dono(): authenticated PRECISA (o RLS o chama no contexto authenticated); anon não.
revoke execute on function public.is_dono() from public, anon;
grant  execute on function public.is_dono() to authenticated, service_role;

-- 2. As 4 RPCs de busca → só service_role (verificado: só o app server-side as chama).
--    Revoga de public E anon E authenticated: revogar só de anon/authenticated seria NO-OP
--    porque o PUBLIC carrega o grant (default-privilege do Supabase).
revoke execute on function public.base_conhecimento_search(vector, text, integer, text, text) from public, anon, authenticated;
grant  execute on function public.base_conhecimento_search(vector, text, integer, text, text) to service_role;

revoke execute on function public.episodic_search(vector, integer, text) from public, anon, authenticated;
grant  execute on function public.episodic_search(vector, integer, text) to service_role;

revoke execute on function public.hybrid_search(text, vector, integer, double precision, double precision, integer) from public, anon, authenticated;
grant  execute on function public.hybrid_search(text, vector, integer, double precision, double precision, integer) to service_role;

revoke execute on function public.increment_access(text) from public, anon, authenticated;
grant  execute on function public.increment_access(text) to service_role;

-- 3. search_path FIXO nas 4 (mata o WARN function_search_path_mutable).
--    CRÍTICO: incluir `extensions` — o operador `<=>` e o tipo `vector` do pgvector vivem
--    lá (create extension ... with schema extensions, na 0001). `= public` sozinho quebraria
--    TODA a busca vetorial (operator does not exist: extensions.vector <=> extensions.vector).
alter function public.base_conhecimento_search(vector, text, integer, text, text)                       set search_path = public, extensions;
alter function public.episodic_search(vector, integer, text)                                            set search_path = public, extensions;
alter function public.hybrid_search(text, vector, integer, double precision, double precision, integer) set search_path = public, extensions;
alter function public.increment_access(text)                                                            set search_path = public, extensions;
