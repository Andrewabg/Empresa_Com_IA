-- 0081: a lista de threads do historico exclui conversas VAZIAS (sem mensagem) e o
-- preview cai da 1a fala do usuario para a 1a mensagem (qualquer papel) quando preciso.
-- Threads sem mensagem sao shells (abrir a sala sem enviar) e nao sao "conversas".

create or replace function public.conversations_list(
  p_operator_id text,
  p_agent_id    text,
  match_count   int default 60
) returns table (
  id uuid, title text, title_provisional boolean, updated_at timestamptz, preview text
) language sql stable as $$
  select c.id, c.title, c.title_provisional, c.updated_at,
    coalesce(
      (select m.content from public.messages m
       where m.conversation_id = c.id and m.role = 'user' and m.content is not null
       order by m.created_at asc limit 1),
      (select m.content from public.messages m
       where m.conversation_id = c.id and m.content is not null
       order by m.created_at asc limit 1)
    ) as preview
  from public.conversations c
  where c.operator_id::text = p_operator_id and c.agent_id = p_agent_id
    and exists (select 1 from public.messages m
                where m.conversation_id = c.id and m.content is not null)
  order by c.updated_at desc
  limit match_count
$$;

revoke all on function public.conversations_list(text, text, int) from public, anon, authenticated;
grant execute on function public.conversations_list(text, text, int) to service_role;
alter function public.conversations_list(text, text, int) set search_path = public;
