-- 0111: o tipo 'instagram' no CHECK de contatos (aditiva).
-- Nome do constraint conferido no banco antes de escrever.
alter table public.contatos drop constraint if exists contatos_tipo_check;
alter table public.contatos add constraint contatos_tipo_check
  check (tipo in ('whatsapp','instagram'));
