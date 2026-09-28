-- 0100 — Desligar um agente (demitir), separado de "de férias".
--
-- `enabled=false` significa férias: o agente para de trabalhar mas continua sendo do
-- time (aparece no organograma, conta na equipe, ocupa a vaga do cargo na Loja).
-- Faltava o estado de quem NÃO faz mais parte do time. `dismissed_at` marca isso sem
-- apagar a linha: histórico, tarefas, custo e conversas continuam apontando pro mesmo
-- id, e readmitir é limpar a marca.
--
-- Aditiva/expand-only: coluna nova anulável, sem default e sem backfill — o container
-- da versão anterior segue rodando contra este schema (nenhuma linha existente muda de
-- comportamento, porque NULL é exatamente "não desligado").

alter table public.agents
  add column if not exists dismissed_at timestamptz;

-- Todo caminho de roster filtra por "não desligado"; o índice parcial mantém esse
-- filtro barato sem indexar as linhas desligadas (que são a minoria e só a tela de
-- histórico lê).
create index if not exists agents_ativos_idx
  on public.agents (is_primary desc)
  where dismissed_at is null;
