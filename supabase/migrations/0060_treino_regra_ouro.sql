




alter table public.treino_correcoes
  drop constraint if exists treino_correcoes_gaveta_check,
  add constraint treino_correcoes_gaveta_check
  check (gaveta in ('base','diretriz','persona','playbook','regra'));
