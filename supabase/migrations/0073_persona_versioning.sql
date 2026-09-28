-- 0073_persona_versioning.sql
-- Versionamento de persona de cargo: rastreia a versao do definition instalada e o
-- hash do system_prompt na ultima sincronizacao (clobber-guard do refresh version-gated).
alter table public.agents
  add column if not exists definition_version integer not null default 0,
  add column if not exists synced_prompt_hash text;
