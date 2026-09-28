-- 0124: a troca da sequencia carimba a automacao e recusa sequencia vazia (aditiva).

create or replace function public.ig_substituir_passos(
  p_automacao_id uuid, p_passos jsonb
) returns void language plpgsql
set search_path = public
as $$
begin
  if p_passos is null or jsonb_typeof(p_passos) <> 'array' or jsonb_array_length(p_passos) = 0 then
    raise exception 'ig_substituir_passos: sequencia vazia';
  end if;
  perform pg_advisory_xact_lock(hashtext('ig_substituir_passos'), hashtext(p_automacao_id::text));
  delete from public.ig_automacao_passos where automacao_id = p_automacao_id;
  insert into public.ig_automacao_passos (automacao_id, posicao, texto, imagem_path, botoes, atraso_s)
  select
    p_automacao_id,
    (p->>'posicao')::smallint,
    p->>'texto',
    p->>'imagem_path',
    coalesce(p->'botoes', '[]'::jsonb),
    coalesce((p->>'atraso_s')::integer, 0)
  from jsonb_array_elements(p_passos) as p;
  update public.ig_automacoes set updated_at = now() where id = p_automacao_id;
end $$;

revoke execute on function public.ig_substituir_passos(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.ig_substituir_passos(uuid, jsonb) to service_role;
