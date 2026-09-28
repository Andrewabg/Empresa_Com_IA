-- Sala do painel que originou a aprovação. Aditiva/expand-only: nullable, sem default.
-- Permite devolver o RESULTADO da ação aprovada para a conversa onde ela nasceu.
alter table public.approvals
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

create index if not exists approvals_conversation_id_idx
  on public.approvals (conversation_id)
  where conversation_id is not null;
