-- 0068_brain_imports_target.sql — sink alternativo do import: notas git (default) OU base do atendente.
-- Aditiva/expand-only: container velho ignora as colunas; lotes existentes ficam target='cerebro'.
alter table public.brain_imports
  add column if not exists target text not null default 'cerebro'
    check (target in ('cerebro','base')),
  add column if not exists base_agent_id text;  -- canal-agente cujo base recebe os rascunhos (null = todos os canais)
