create or replace function public.reset_listar_tabelas()
returns table(table_name text) language sql stable security definer set search_path=public as $$
  select c.relname::text
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'
$$;
revoke execute on function public.reset_listar_tabelas() from public, anon, authenticated;
grant execute on function public.reset_listar_tabelas() to service_role;

-- Grafo de FK do schema public ao vivo: cada linha e uma aresta filho -> pai.
-- O planner (planDeletion) usa isso p/ descobrir escopo e ordenar a delecao.
-- unnest(con.conkey) emite UMA linha por coluna do FK (nao so a 1a): FK composta
-- vira N arestas, senao o reset dropava as colunas extras e corrompia a ordem.
create or replace function public.reset_fk_graph()
returns table(child text, child_col text, parent text, on_delete text)
language sql stable security definer set search_path=public as $$
  select (con.conrelid::regclass)::text, att.attname::text,
         (con.confrelid::regclass)::text,
         case con.confdeltype when 'c' then 'cascade' when 'n' then 'set null'
              when 'a' then 'no action' when 'r' then 'restrict' else 'no action' end
  from pg_constraint con
  cross join lateral unnest(con.conkey) as k(attnum)
  join pg_attribute att on att.attrelid=con.conrelid and att.attnum=k.attnum
  where con.contype='f' and (con.connamespace::regnamespace)::text='public'
$$;
revoke execute on function public.reset_fk_graph() from public, anon, authenticated;
grant execute on function public.reset_fk_graph() to service_role;

-- Conta orfaos de uma aresta de FK: filhos com <col> preenchida cujo valor nao
-- existe no PK <id> do pai. Read-only; usada pela varredura de integridade dos
-- testes. %I escapa os identificadores (nome de tabela/coluna vem do grafo).
create or replace function public.reset_contar_orfaos(p_child text, p_col text, p_parent text)
returns bigint language plpgsql stable security definer set search_path=public as $$
declare n bigint;
begin
  execute format(
    'select count(*) from public.%I ch where ch.%I is not null '
    || 'and not exists (select 1 from public.%I p where p.id = ch.%I)',
    p_child, p_col, p_parent, p_col
  ) into n;
  return n;
end $$;
revoke execute on function public.reset_contar_orfaos(text, text, text) from public, anon, authenticated;
grant execute on function public.reset_contar_orfaos(text, text, text) to service_role;

-- Executor atomico do reset. Aplica uma lista whitelistada de ops (sem SQL cru
-- do cliente): delete (com predicado keep fixo), update_sync_state e
-- delete_settings_keys. Tabelas de infra sao protegidas por raise; erro em
-- qualquer op aborta a transacao inteira (nada e apagado parcialmente).
create or replace function public.factory_reset(p_ops jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  op jsonb; tbl text; keep text; n bigint; total jsonb := '{}'::jsonb;
  kept_agent_ids text[];
begin
  perform pg_advisory_xact_lock(hashtext('awave_factory_reset'));
  -- kept vazio => NULL => nao_kept_agente vira no-op (falha fechado, nunca apaga tudo).
  select array_agg(id) into kept_agent_ids from agents where is_primary or id = 'coo';

  for op in select * from jsonb_array_elements(p_ops) loop
    case op->>'op'
      when 'delete' then
        tbl := op->>'table';
        -- lower(): blocklist case-insensitive (belt-and-suspenders). O schema e
        -- todo minusculo hoje, mas nao dependemos disso pra a protecao valer.
        if lower(tbl) in ('operator_identity','awave_migrations','sync_state','settings') then
          raise exception 'reset: tabela protegida %', tbl; end if;
        if to_regclass('public.'||quote_ident(tbl)) is null then
          raise exception 'reset: tabela inexistente %', tbl; end if;
        keep := op->>'keep';
        if keep = 'primary_coo' then
          -- Falha fechado: sem agente ancora (is_primary/coo) o WHERE apagaria o
          -- roster INTEIRO. Aborta a transacao em vez de destruir tudo.
          if kept_agent_ids is null then raise exception 'reset: sem agente ancora (is_primary/coo), abortado'; end if;
          execute format('delete from public.%I where not (is_primary or id = %L)', tbl, 'coo');
        elsif keep = 'dono' then
          execute format('delete from public.%I where papel <> %L', tbl, 'dono');
        elsif keep = 'nao_kept_agente' then
          -- Falha fechado: sem ancora, `col <> all(NULL)` seria NULL (no-op) e o
          -- roster ficaria orfao/inconsistente. Aborta antes de qualquer delete.
          if kept_agent_ids is null then raise exception 'reset: sem agente ancora (is_primary/coo), abortado'; end if;
          declare cols text[]; col text; cond text := '';
          begin
            cols := array(select jsonb_array_elements_text(op->'fk_cols'));
            foreach col in array cols loop
              cond := cond || (case when cond = '' then '' else ' or ' end)
                    || format('(%I is not null and %I <> all($1))', col, col);
            end loop;
            if cond = '' then raise exception 'reset: nao_kept_agente sem fk_cols para %', tbl; end if;
            execute format('delete from public.%I where %s', tbl, cond) using kept_agent_ids;
          end;
        else
          execute format('delete from public.%I where true', tbl);
        end if;
        get diagnostics n = row_count;
        total := total || jsonb_build_object(tbl, n);
      when 'update_sync_state' then
        update sync_state set last_synced_sha = null where id = 1;
      when 'delete_settings_keys' then
        -- A SQL e o trust boundary: mesmo que o planner so mande CHAVES_IDENTIDADE,
        -- rejeita aqui as chaves de licenca/proveniencia (RS2). Apaga-las mataria o
        -- kill-switch offline. Uma unica chave protegida aborta a transacao inteira.
        if exists (
          select 1 from jsonb_array_elements_text(op->'keys') k
          where k like 'license%' or k in ('install_nonce','hb_integrity','instance_id')
        ) then raise exception 'reset: chave de settings protegida'; end if;
        delete from settings where key = any(array(select jsonb_array_elements_text(op->'keys')));
      else raise exception 'reset: op desconhecida %', op->>'op';
    end case;
  end loop;
  return total;
end $$;
revoke execute on function public.factory_reset(jsonb) from public, anon, authenticated;
grant execute on function public.factory_reset(jsonb) to service_role;
