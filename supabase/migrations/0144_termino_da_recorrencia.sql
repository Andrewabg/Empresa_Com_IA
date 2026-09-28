-- 0144: data de término da recorrência (rotinas e lembretes). Aditiva.
-- Nulo = sem fim. `date` (e não timestamptz) porque é a data de parede do dono.

alter table public.rotinas
  add column if not exists termina_em date;

alter table public.lembretes
  add column if not exists termina_em date;
