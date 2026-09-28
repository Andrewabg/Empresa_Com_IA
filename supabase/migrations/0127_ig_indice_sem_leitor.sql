-- 0127: remove o indice de `midia_ids_adicionais`. A coluna fica, sem leitor.
drop index if exists public.ig_automacoes_midias_adicionais_idx;
