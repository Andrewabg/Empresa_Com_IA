import { serverDb } from '../server/supabase'
import { hashPrompt } from '@/lib/persona-hash'
import { novoGerenteDosSubordinados } from '@/lib/agentes/desligamento'


export interface AgentTools {
  buscarCerebro?: boolean
  buscarConversas?: boolean      
  
  lerAcervo?: boolean
  proporMemoria?: boolean
  rascunharMemoria?: boolean     
  composio?: boolean
  registrarConhecimento?: boolean
  registrarEntrevista?: boolean  
  adiarEntrevista?: boolean
  contratarAgente?: boolean      
  delegarTarefa?: boolean        
  planejarObjetivo?: boolean     
  composio_toolkits?: string[]   
  composio_action_modes?: Record<string, 'hitl' | 'direto'>   
  required_toolkits?: string[]   
  emitirArtefato?: boolean       
  gerarImagem?: boolean          
  ajustarEstilo?: boolean        
  ajustarNotificacoes?: boolean  
  gerenciarLembretes?: boolean   
  gerenciarRotinas?: boolean     
  vigilanciaDeclarada?: boolean  
  registrarDiretriz?: boolean    
  anotarAprendizado?: boolean    
  detalharFuncionario?: boolean  
  consultarFuncionario?: boolean 
  transferir?: boolean           
  proporConhecimentoAtendimento?: boolean 
  painelTrafego?: boolean        
  
  proporAcaoMeta?: boolean
  investigacao?: boolean         
  estudioCopy?: boolean          
  
  estudioDesign?: boolean
  escritorioJuridico?: boolean   
  painelGoogle?: boolean         
  
  proporAcaoGoogle?: boolean
  
  painelInstagram?: boolean
  custom_tools?: string[]        
}

export interface AgentBudget {
  per_task_usd?: number
  per_invocation_steps?: number
}


export interface AgentRow {
  id: string
  name: string
  role: string
  system_prompt: string
  model: string | null
  voice: string | null           
  voz_desligada: boolean         
  tools: AgentTools
  enabled: boolean
  is_primary: boolean
  manager_id: string | null      
  brain_read_scopes: string[]
  skills: string[]               
  definition_version: number     
  synced_prompt_hash: string | null  
  
  dismissed_at: string | null
  budget: AgentBudget | null      
  sensitive_policy: unknown | null
  triggers: unknown | null
  created_at: string
  updated_at: string
}


export interface AgentSeed {
  id: string
  name: string
  role: string
  system_prompt: string
  model: string | null
  voice?: string | null          
  tools: AgentTools
  enabled: boolean
  is_primary: boolean
  manager_id?: string | null     
  definition_version?: number    
}


export async function listAgents(): Promise<AgentRow[]> {
  const { data, error } = await serverDb().from('agents').select().is('dismissed_at', null).order('is_primary', { ascending: false })
  if (error) throw new Error(`listAgents: ${error.message}`)
  return (data ?? []) as AgentRow[]
}


export async function listAgentsIncluindoDesligados(): Promise<AgentRow[]> {
  const { data, error } = await serverDb().from('agents').select().order('is_primary', { ascending: false })
  if (error) throw new Error(`listAgentsIncluindoDesligados: ${error.message}`)
  return (data ?? []) as AgentRow[]
}


export interface AgentSummary { id: string; name: string; enabled: boolean; tools: AgentTools; is_primary: boolean }
export async function listAgentsSummary(): Promise<AgentSummary[]> {
  const { data, error } = await serverDb()
    .from('agents')
    .select('id,name,enabled,tools,is_primary')
    .is('dismissed_at', null)
    .order('is_primary', { ascending: false })
  if (error) throw new Error(`listAgentsSummary: ${error.message}`)
  return (data ?? []) as AgentSummary[]
}

export async function getAgentRow(id: string): Promise<AgentRow | null> {
  const { data, error } = await serverDb().from('agents').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getAgentRow: ${error.message}`)
  return (data as AgentRow | null) ?? null
}


export async function getAgentBySlugOuRole(slug: string): Promise<AgentRow | null> {
  const porId = await getAgentRow(slug)
  if (porId) return porId
  const { data, error } = await serverDb().from('agents').select('*').eq('role', slug).limit(1).maybeSingle()
  if (error) throw new Error(`getAgentBySlugOuRole(${slug}): ${error.message}`)
  if (data) return data as AgentRow
  
  
  
  
  
  
  
  
  const alvo = slug.replace(/([\\%_])/g, '\\$1')
  const porNome = await serverDb().from('agents').select('*').ilike('name', alvo).limit(1).maybeSingle()
  if (porNome.error) throw new Error(`getAgentBySlugOuRole(${slug}): ${porNome.error.message}`)
  return (porNome.data as AgentRow | null) ?? null
}

export async function getPrimaryAgentRow(): Promise<AgentRow | null> {
  const { data, error } = await serverDb().from('agents').select().eq('is_primary', true).maybeSingle()
  if (error) throw new Error(`getPrimaryAgentRow: ${error.message}`)
  return (data as AgentRow | null) ?? null
}


export async function getPrimaryAgentName(): Promise<string | null> {
  const { data, error } = await serverDb().from('agents').select('name').eq('is_primary', true).maybeSingle()
  if (error) throw new Error(`getPrimaryAgentName: ${error.message}`)
  return (data as { name: string } | null)?.name ?? null
}


export async function ensurePrimaryAgent(seed: AgentSeed): Promise<AgentRow> {
  const existente = await getAgentRow(seed.id)
  if (existente) return existente
  const db = serverDb()
  const { error: insErr } = await db.from('agents').upsert(
    {
      id: seed.id, name: seed.name, role: seed.role, system_prompt: seed.system_prompt,
      model: seed.model, voice: seed.voice ?? null, tools: seed.tools, enabled: seed.enabled, is_primary: seed.is_primary,
      manager_id: seed.manager_id ?? null,
      definition_version: seed.definition_version ?? 0,
      
      
      
      
      synced_prompt_hash: hashPrompt(seed.system_prompt),
    },
    { onConflict: 'id', ignoreDuplicates: true }, 
  )
  if (insErr) throw new Error(`ensurePrimaryAgent insert: ${insErr.message}`)
  const row = await getAgentRow(seed.id)
  if (!row) throw new Error('ensurePrimaryAgent: linha sumiu após upsert')
  return row
}


export async function ensureSeedRoster(seeds: AgentSeed[]): Promise<void> {
  for (const seed of seeds) {
    await ensurePrimaryAgent(seed)
  }
}


export async function updateAgent(
  id: string,
  patch: Partial<Pick<AgentRow, 'system_prompt' | 'model' | 'voice' | 'voz_desligada' | 'tools' | 'enabled' | 'name' | 'role' | 'skills' | 'manager_id' | 'brain_read_scopes' | 'budget' | 'definition_version' | 'synced_prompt_hash'>>,
): Promise<AgentRow> {
  const { data, error } = await serverDb()
    .from('agents')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`updateAgent: ${error.message}`)
  return data as AgentRow
}

export interface CreateAgentInput {
  id?: string                     
  name: string
  role: string
  system_prompt: string
  model?: string | null
  voice?: string | null
  tools: AgentTools
  enabled?: boolean
  manager_id?: string | null
  brain_read_scopes?: string[]
  skills?: string[]
  budget?: AgentBudget | null
  sensitive_policy?: unknown | null
  definition_version?: number
  synced_prompt_hash?: string | null
}

function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'agente'
}


async function uniqueAgentId(base: string): Promise<string> {
  const root = slugify(base)
  for (let i = 1; i < 100; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`
    if (!(await getAgentRow(candidate))) return candidate
  }
  
  return `${root}-${Date.now().toString(36)}`
}

export async function createAgent(input: CreateAgentInput): Promise<AgentRow> {
  const id = input.id ?? (await uniqueAgentId(input.role))
  const { data, error } = await serverDb()
    .from('agents')
    .insert({
      id,
      name: input.name,
      role: input.role,
      system_prompt: input.system_prompt,
      model: input.model ?? null,
      voice: input.voice ?? null,
      tools: input.tools ?? {},
      enabled: input.enabled ?? true,
      is_primary: false,                    
      manager_id: input.manager_id ?? null,
      brain_read_scopes: input.brain_read_scopes ?? [],
      skills: input.skills ?? [],
      budget: input.budget ?? null,
      sensitive_policy: input.sensitive_policy ?? null,
      definition_version: input.definition_version ?? 0,
      synced_prompt_hash: input.synced_prompt_hash ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(`createAgent: ${error.message}`)
  return data as AgentRow
}


export async function recontratarCargo(
  id: string,
  seed: Omit<CreateAgentInput, 'id'> & { manager_id: string | null },
  agora = new Date().toISOString(),
): Promise<AgentRow> {
  const { data, error } = await serverDb()
    .from('agents')
    .update({
      name: seed.name,
      role: seed.role,
      system_prompt: seed.system_prompt,
      model: seed.model ?? null,
      voice: seed.voice ?? null,
      tools: seed.tools ?? {},
      enabled: seed.enabled ?? true,
      manager_id: seed.manager_id,
      brain_read_scopes: seed.brain_read_scopes ?? [],
      skills: seed.skills ?? [],
      budget: seed.budget ?? null,
      definition_version: seed.definition_version ?? 0,
      synced_prompt_hash: seed.synced_prompt_hash ?? null,
      dismissed_at: null,
      updated_at: agora,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`recontratarCargo: ${error.message}`)
  return data as AgentRow
}

export async function getAgentsByManager(managerId: string): Promise<AgentRow[]> {
  const { data, error } = await serverDb().from('agents').select().eq('manager_id', managerId).is('dismissed_at', null)
  if (error) throw new Error(`getAgentsByManager: ${error.message}`)
  return (data ?? []) as AgentRow[]
}


export async function dismissAgent(id: string, primarioId: string | null, agora = new Date().toISOString()): Promise<AgentRow> {
  const db = serverDb()
  const alvo = await getAgentRow(id)
  if (!alvo) throw new Error(`dismissAgent: agente "${id}" não existe`)

  const novoGerente = novoGerenteDosSubordinados(alvo, primarioId)
  
  
  const { error: reparentErr } = await db
    .from('agents')
    .update({ manager_id: novoGerente === id ? null : novoGerente, updated_at: agora })
    .eq('manager_id', id)
  if (reparentErr) throw new Error(`dismissAgent (subordinados): ${reparentErr.message}`)

  const { data, error } = await db
    .from('agents')
    .update({ dismissed_at: agora, enabled: false, manager_id: null, updated_at: agora })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`dismissAgent: ${error.message}`)
  return data as AgentRow
}


export async function readmitAgent(id: string, agora = new Date().toISOString()): Promise<AgentRow> {
  const { data, error } = await serverDb()
    .from('agents')
    .update({ dismissed_at: null, enabled: false, updated_at: agora })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`readmitAgent: ${error.message}`)
  return data as AgentRow
}


export async function managerChainHasCycle(childId: string, managerId: string | null): Promise<boolean> {
  let cur = managerId
  const seen = new Set<string>()
  while (cur) {
    if (cur === childId) return true
    if (seen.has(cur)) return true
    seen.add(cur)
    const row = await getAgentRow(cur)
    cur = row?.manager_id ?? null
  }
  return false
}
