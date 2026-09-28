alter table public.lembretes
  add column if not exists contexto text,
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null;
