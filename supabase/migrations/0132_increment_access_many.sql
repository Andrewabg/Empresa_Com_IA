-- 0132 — increment_access_many: UMA viagem em vez de ate trinta.
--
-- Funcao NOVA, ao lado. A `increment_access` (0001) fica INTACTA — mesmas colunas
-- (access_count, last_accessed), mesma semantica, so que para um array de ids num unico
-- UPDATE em vez de um round-trip PostgREST por nota.
create or replace function increment_access_many(p_ids text[])
returns void
language sql
as $$
  update notes
     set access_count = access_count + 1,
         last_accessed = now()
   where id = any(p_ids)
$$;
