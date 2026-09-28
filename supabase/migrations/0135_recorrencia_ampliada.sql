alter table public.rotinas
  add column if not exists dias_semana smallint[];

alter table public.rotinas drop constraint if exists rotinas_frequencia_check;
alter table public.rotinas
  add constraint rotinas_frequencia_check check (frequencia in ('diaria','dias_uteis','semanal','mensal'));
