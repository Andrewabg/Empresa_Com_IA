-- 0103 — "Este agente não fala": voz desligada por agente.
--
-- A coluna `voice` escolhe QUAL voz o agente usa e o valor dela vai cru para a API Realtime da
-- OpenAI, então "não falar" não pode ser um valor especial ali: um sentinela que vazasse quebraria
-- a sessão. Fica em coluna própria, booleana.
--
-- Aditiva/expand-only: `default false` reproduz o comportamento atual (todo agente fala), então o
-- container da versão anterior segue rodando contra este schema.

alter table public.agents
  add column if not exists voz_desligada boolean not null default false;
