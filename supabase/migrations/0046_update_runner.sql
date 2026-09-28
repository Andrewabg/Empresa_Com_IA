


create table if not exists public.awave_migrations (
  version text primary key,
  name text not null,
  applied_at timestamptz not null default now()
);
alter table public.awave_migrations enable row level security;


insert into public.awave_migrations (version, name) values
  ('0001', '0001_brain_schema.sql'),
  ('0002', '0002_hybrid_search.sql'),
  ('0003', '0003_grants.sql'),
  ('0004', '0004_fase1.sql'),
  ('0005', '0005_config.sql'),
  ('0006', '0006_dashboards.sql'),
  ('0007', '0007_brain_rls.sql'),
  ('0008', '0008_cost_realtime.sql'),
  ('0009', '0009_onboarding.sql'),
  ('0010', '0010_tool_actions.sql'),
  ('0011', '0011_agents.sql'),
  ('0012', '0012_fase3b_maestro.sql'),
  ('0013', '0013_memoria.sql'),
  ('0014', '0014_artifacts.sql'),
  ('0015', '0015_memory_jobs.sql'),
  ('0016', '0016_agents_skills.sql'),
  ('0017', '0017_operator_style.sql'),
  ('0018', '0018_maestro_autonomo.sql'),
  ('0019', '0019_aprendizado_agentes.sql'),
  ('0020', '0020_salas_agente.sql'),
  ('0021', '0021_agent_voice.sql'),
  ('0022', '0022_painel_trafego.sql'),
  ('0023', '0023_metric_granularity.sql'),
  ('0024', '0024_bloco_drilldown.sql'),
  ('0025', '0025_account_memory.sql'),
  ('0026', '0026_blocos_plano_historico.sql'),
  ('0027', '0027_estudio_copy.sql'),
  ('0028', '0028_swipes.sql'),
  ('0029', '0029_campanhas.sql'),
  ('0030', '0030_direcao_arte.sql'),
  ('0031', '0031_escritorio_juridico.sql'),
  ('0032', '0032_canais_atendimento.sql'),
  ('0033', '0033_reflect_atendimento.sql'),
  ('0034', '0034_reflect_brand.sql'),
  ('0035', '0035_peca_no_ar.sql'),
  ('0036', '0036_prazos.sql'),
  ('0037', '0037_reflect_peca.sql'),
  ('0038', '0038_perf_indexes.sql'),
  ('0039', '0039_cost_summary_rpc.sql'),
  ('0040', '0040_assistente_proativo.sql'),
  ('0041', '0041_lembrete_dia_ancora.sql'),
  ('0042', '0042_cached_tokens.sql'),
  ('0043', '0043_operator_identity.sql'),
  ('0044', '0044_directive_approval.sql'),
  ('0045', '0045_lock_rpc_exposure.sql'),
  ('0046', '0046_update_runner.sql')
on conflict (version) do nothing;
