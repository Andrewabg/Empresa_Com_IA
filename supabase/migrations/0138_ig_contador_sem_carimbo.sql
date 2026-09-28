-- 0138: o contador de disparos deixa de carimbar a data de ultima edicao (aditiva).

create or replace function public.ig_incrementar_contador(
  p_automacao_id uuid, p_coluna text, p_quanto integer
) returns void language plpgsql security definer
set search_path = public
as $$
begin
  if p_coluna not in ('disparos','dms_enviadas','respostas_publicas') then
    raise exception 'coluna invalida';
  end if;
  execute format('update public.ig_automacoes set %I = %I + $1 where id = $2', p_coluna, p_coluna)
    using p_quanto, p_automacao_id;
end $$;
