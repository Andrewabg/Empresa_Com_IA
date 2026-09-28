import type { CategoriaId } from './tipos'





const MEMORY_CORE_KEY = 'memory_core' 
const COMPANY_FACTS_KEY = 'company_facts' 
const ORIGENS_RECUSADAS_KEY = 'memoria_origens_recusadas_avisadas' 


export const ORDEM_CATEGORIAS = [
  'trabalho', 'memoria', 'agentes', 'cerebro', 'equipe', 'credenciais', 'identidade',
] as const satisfies readonly CategoriaId[]


export const TABELAS_POR_CATEGORIA: Record<CategoriaId, string[]> = {
  trabalho: [
    
    
    'task_transitions', 'tasks', 'plans', 'plan_steps', 'approvals', 'acao_resultados', 'artifacts',
    'events', 'cost_events', 'memory_jobs', 'notificacoes', 'lembretes', 'rotinas',
    
    
    
    'intencoes_permanentes',
    'webhook_events', 'hiring_sessions',
    'conversations', 'messages', 'episodic_memory',
    
    
    
    'uso_da_memoria',
    'campanhas', 'metric_snapshots', 'painel_blocos', 'pecas', 'peca_versoes', 'swipes',
    'contratos', 'contrato_versoes', 'ficha_juridica', 'prazos',
    'contatos', 'conversas_externas', 'mensagens_externas', 'atendimento_jobs',
    
    
    
    
    'custom_envios',
    
    
    
    'canal_webhook_events',
    
    
    
    
    'ig_comentarios',
    
    
    
    
    
    
    'ig_jobs', 'ig_automacao_runs', 'ig_automacao_passos', 'ig_automacoes',
    
    
    
    
    
    'fonte_execucoes', 'fonte_consultas',
  ],
  memoria: [
    'account_memory', 'agent_directives', 'treino_casos', 'treino_correcoes',
    
    
    'atendente_persona', 'base_conhecimento_chunks', 'base_conhecimento',
    'agent_config_drafts', 'agent_config_versions',
  ],
  agentes: ['agents'],
  cerebro: ['notes', 'note_chunks', 'edges', 'memory_candidates', 'brain_imports', 'brain_import_files'],
  equipe: ['equipe_membros', 'equipe_convites'],
  
  
  
  
  credenciais: ['canal_midia_publica', 'canais', 'fontes'],
  identidade: ['brands', 'brand_memory', 'onboarding_session', 'operator_style'],
}


export const NUNCA_TOCADO = new Set<string>([
  'operator_identity', 'awave_migrations', 'sync_state', 'settings',
])




export const IGNORAR_COBERTURA = new Set<string>([])


export const CHAVES_IDENTIDADE = [
  'company_name', 'operator_name', 'mission', 'voice_tone', 'born_at', 'company_born',
  'company_identity_provisional', 'brand_app_name', 'brand_assistant_name', 'brand_logo_url', 'brand_accent',
  'atalhos_rail',
] as const


export const CHAVES_POR_CATEGORIA: Partial<Record<CategoriaId, readonly string[]>> = {
  
  
  
  
  memoria: [MEMORY_CORE_KEY, COMPANY_FACTS_KEY],
  
  
  
  
  
  cerebro: [ORIGENS_RECUSADAS_KEY],
  identidade: CHAVES_IDENTIDADE,
}
