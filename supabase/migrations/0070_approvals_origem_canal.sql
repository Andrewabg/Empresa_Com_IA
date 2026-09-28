-- Origem de canal p/ aprovações tool_action criadas pelo atendente (Fatia 3a).
-- Aditiva/expand-only: nullable, sem default, sem FK (rótulo forense, não integridade).
alter table public.approvals
  add column if not exists conversa_id text,
  add column if not exists contato_id text,
  add column if not exists canal_id text;
