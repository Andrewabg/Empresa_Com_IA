-- 0076_convite_rotulo.sql
-- Identificação opcional do convite ("para quem é"). Aditiva/expand-only.
alter table public.equipe_convites add column if not exists rotulo text;
