-- 0079: lista de threads com preview da 1a mensagem (rotulo de conteudo quando nao ha titulo).
-- RPC dedicada (indexavel por conversation_id) em vez de buscar todas as mensagens no cliente.

create or replace function public.conversations_list(
  p_operator_id text,
  p_agent_id    text,
  match_count   int default 60
) returns table (
  id uuid, title text, title_provisional boolean, updated_at timestamptz, preview text
) language sql stable as $$
  select c.id, c.title, c.title_provisional, c.updated_at,
    (select m.content from public.messages m
     where m.conversation_id = c.id and m.role = 'user' and m.content is not null
     order by m.created_at asc limit 1) as preview
  from public.conversations c
  where c.operator_id::text = p_operator_id and c.agent_id = p_agent_id
  order by c.updated_at desc
  limit match_count
$$;

-- Acesso: so service_role executa (revoke do grant PUBLIC default) + search_path fixo.
revoke all on function public.conversations_list(text, text, int) from public, anon, authenticated;
grant execute on function public.conversations_list(text, text, int) to service_role;
alter function public.conversations_list(text, text, int) set search_path = public;
