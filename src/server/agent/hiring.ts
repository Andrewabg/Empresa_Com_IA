
import { generateAgentSpec, type AgentSpec, type ArchitectDeps } from './architect'
import { cargosEquivalentes } from '@/lib/maestro/cargoMatch'
import { createAgent, getAgentRow, listAgents, type AgentRow } from '@/data/agents'
import { invalidateAgentCache } from './jarvis'
import { createTask } from '@/data/tasks'
import { runTask } from './executor/runTask'
import { textoDaDelegacao } from '@/lib/agentes/textoDaDelegacao'
import type { CriarSkillInput } from '../skills/criarSkill'
export type { CriarSkillInput }

export interface ContratarInput { cargo: string; instrução: string; tools?: string[]; manager_id?: string | null }
export interface ContratarResult {
  created: boolean
  agentId?: string
  name?: string
  role?: string
  reason?: 'role_exists' | 'manager_missing'
  existingId?: string
  summary: string
}

export interface MaterializarOpts {
  manager: string
  
  cargoOriginal: string
  
  criarSkill?: (i: CriarSkillInput) => Promise<unknown>
  
  requiredToolkits?: string[]
}
export interface MaterializarResult { row: AgentRow; skillNovaFalhou: string | null }

export async function contratarAgente(
  input: ContratarInput,
  ctx: { actingAgentId?: string } = {},
  deps: {
    architect?: ArchitectDeps
    
    criarSkill?: (input: CriarSkillInput) => Promise<unknown>
  } = {},
): Promise<ContratarResult> {
  const manager = input.manager_id ?? ctx.actingAgentId ?? 'jarvis'
  if (manager && !(await getAgentRow(manager))) {
    return { created: false, reason: 'manager_missing', summary: `O gerente "${manager}" não existe — não consegui contratar.` }
  }
  
  
  
  const existing = (await listAgents()).find(
    (a) => a.enabled && cargosEquivalentes(a.role, input.cargo),
  )
  if (existing) {
    return {
      created: false, reason: 'role_exists', existingId: existing.id,
      summary: `Já existe um agente ativo no cargo "${existing.role}" (${existing.name}). Quer contratar outro mesmo assim, ou prefere ajustar o atual?`,
    }
  }
  const spec = await generateAgentSpec(
    { cargo: input.cargo, instrução: input.instrução, toolsDesejadas: input.tools, manager_id: manager },
    deps.architect,
  )
  const { row, skillNovaFalhou } = await materializarSpec(spec, {
    manager,
    cargoOriginal: input.cargo,
    criarSkill: deps.criarSkill,
  })
  const obsSkill = skillNovaFalhou
    ? ` (Obs.: não consegui criar a skill nova "${skillNovaFalhou}" agora — o agente segue com as skills existentes; pode tentar de novo depois.)`
    : ''
  return {
    created: true, agentId: row.id, name: row.name, role: row.role,
    summary: `Contratei ${row.name} para o cargo de ${row.role}. Já está no organograma; você pode revisar a persona em /agentes.${obsSkill}`,
  }
}


export async function materializarSpec(spec: AgentSpec, opts: MaterializarOpts): Promise<MaterializarResult> {
  
  
  
  
  
  
  
  const criar = opts.criarSkill ?? ((i: CriarSkillInput) => import('../skills/criarSkill').then((m) => m.criarSkill(i)))
  let skillNovaFalhou: string | null = null 
  if (spec.skill_nova.autorar) {
    try {
      await criar({
        slug: spec.skill_nova.slug,
        description: spec.skill_nova.description,
        instructions: spec.skill_nova.instructions,
        agent: spec.name,
        reason: `Skill autorada na contratação de ${spec.role}`,
      })
      if (!spec.skills.includes(spec.skill_nova.slug)) spec.skills.push(spec.skill_nova.slug)
    } catch (err) {
      skillNovaFalhou = spec.skill_nova.slug
      console.warn('[materializarSpec] criarSkill falhou (contratação segue com as skills existentes):', err)
    }
  }
  const row = await createAgent({
    name: spec.name,
    
    
    
    
    
    
    role: opts.cargoOriginal,
    system_prompt: spec.system_prompt,
    
    
    
    tools: {
      ...spec.tools,
      anotarAprendizado: true,
      composio_toolkits: spec.composio_toolkits,
      ...(opts.requiredToolkits?.length ? { required_toolkits: opts.requiredToolkits } : {}),
    },
    manager_id: opts.manager,
    brain_read_scopes: spec.brain_read_scopes,
    skills: spec.skills, 
    budget: spec.budget,
  })
  invalidateAgentCache() 
  return { row, skillNovaFalhou }
}

export interface DelegarInput {
  agentId: string
  objetivo: string
  budget?: number
  
  parent_task_id?: string | null
}
export interface DelegarResult { taskId?: string; status: 'queued' | 'error'; summary: string }

export async function delegarTarefa(
  input: DelegarInput,
  ctx: { conversationId?: string | null; actingAgentId?: string; operatorId?: string } = {},
  deps: { run?: (id: string) => void } = {},
): Promise<DelegarResult> {
  const row = await getAgentRow(input.agentId)
  if (!row) return { status: 'error', summary: `Não achei um agente com id "${input.agentId}".` }
  
  
  if (row.dismissed_at) return { status: 'error', summary: `${row.name} não faz mais parte do time (foi desligado). Para usá-lo de novo, contrate o cargo outra vez na Loja ou traga de volta em /agentes.` }
  if (!row.enabled) return { status: 'error', summary: `${row.name} está de férias (desligado do trabalho) e não pode receber tarefa. Ative na ficha dele em /agentes.` }
  const task = await createTask({
    agent_id: input.agentId,
    created_by: ctx.actingAgentId ?? 'jarvis',
    conversation_id: ctx.conversationId ?? null,
    objective: input.objetivo,
    budget_usd: input.budget ?? null,
    parent_task_id: input.parent_task_id ?? null,
    
    
    operator_id: ctx.operatorId ?? null,
  })
  const fire = deps.run ?? ((id: string) => { void runTask(id) })
  fire(task.id) 
  return { taskId: task.id, status: 'queued', summary: textoDaDelegacao(row.name, Boolean(ctx.conversationId)) }
}
