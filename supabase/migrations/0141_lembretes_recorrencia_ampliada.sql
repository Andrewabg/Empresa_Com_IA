-- 0141 -- lembretes.recorrencia: alarga o CHECK para a mesma lista de rotinas.frequencia (0135).
alter table public.lembretes drop constraint if exists lembretes_recorrencia_check;
alter table public.lembretes
  add constraint lembretes_recorrencia_check check (recorrencia in ('diaria','dias_uteis','semanal','mensal'));
