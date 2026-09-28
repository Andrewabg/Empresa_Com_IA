create unique index if not exists fonte_consultas_nota_path_uk
  on public.fonte_consultas (nota_path) where nota_path is not null;

alter table public.fonte_consultas
  add constraint fonte_consultas_agenda_frequencia_check
  check (agenda->>'frequencia' in ('diaria','semanal','mensal')) not valid;
