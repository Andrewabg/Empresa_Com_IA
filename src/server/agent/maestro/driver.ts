
import {
  getPlanByTask,
  getSteps,
  updateStep,
  setPlanStatus,
  incReplans,
  type PlanStepRow,
} from '@/data/plans'
import { listChildTasks, updateTask, type TaskRow } from '@/data/tasks'
import { listAgents } from '@/data/agents'
import {
  passosProntos,
  passosBloqueados,
  ondaCompleta,
  tudoConcluido,
  orcamentoEstourado,
} from '@/lib/maestro-plan'
import { cargosEquivalentes } from '@/lib/maestro/cargoMatch'
import { resumeRoot } from './join'
import { aggregate, replan } from './aggregate'
import { contratarAgente, delegarTarefa } from '../hiring'
import { getTurnContext } from '../turnContext'
import { notificarPlanoTerminal } from '@/server/proativo/producers'

export interface DriverCaps {
  maxSteps: number
  maxChildrenPerWave: number
  maxReplans: number
}

export interface DriverDeps {
  getPlanByTask: typeof getPlanByTask
  getSteps: typeof getSteps
  updateStep: typeof updateStep
  setPlanStatus: typeof setPlanStatus
  
  incReplans: typeof incReplans
  listChildTasks: typeof listChildTasks
  
  ensureAgentForRole: (role: string) => Promise<string>
  
  delegar: (agentId: string, subObjective: string, parentTaskId: string) => Promise<string>
  
  parkNeedsChildren: (rootTaskId: string) => Promise<void>
  
  finalize: (rootTaskId: string, status: 'done' | 'failed', result: string) => Promise<void>
  
  resumeRoot: (rootTaskId: string) => Promise<void>
  
  aggregate: (rootTask: TaskRow, steps: PlanStepRow[]) => Promise<string>
  
  replan: (rootTask: TaskRow, steps: PlanStepRow[]) => Promise<boolean>
  
  notificarPlanoTerminal?: typeof notificarPlanoTerminal
  caps: DriverCaps
}

export const DEFAULT_CAPS: DriverCaps = { maxSteps: 12, maxChildrenPerWave: 6, maxReplans: 3 }




async function defaultEnsureAgentForRole(role: string): Promise<string> {
  const existing = (await listAgents()).find(
    (a) => a.enabled && cargosEquivalentes(a.role, role),
  )
  if (existing) return existing.id

  const res = await contratarAgente({
    cargo: role,
    instrução: `Cargo necessário para executar um passo do plano de orquestração do COO.`,
  })
  const id = res.agentId ?? res.existingId
  if (!id) throw new Error(`Não consegui garantir um agente para o cargo "${role}": ${res.summary}`)
  return id
}


async function defaultDelegar(agentId: string, subObjective: string, parentTaskId: string): Promise<string> {
  const tc = getTurnContext()
  const res = await delegarTarefa(
    { agentId, objetivo: subObjective, parent_task_id: parentTaskId },
    { conversationId: tc.conversationId ?? null, actingAgentId: tc.actingAgentId, operatorId: tc.operatorId },
  )
  if (res.status !== 'queued' || !res.taskId) {
    throw new Error(`Falha ao delegar o passo para ${agentId}: ${res.summary}`)
  }
  return res.taskId
}


export function defaultDriverDeps(): DriverDeps {
  return {
    getPlanByTask,
    getSteps,
    updateStep,
    setPlanStatus,
    incReplans,
    listChildTasks,
    ensureAgentForRole: defaultEnsureAgentForRole,
    delegar: defaultDelegar,
    parkNeedsChildren: async (rootTaskId) => {
      await updateTask(rootTaskId, { status: 'needs_children' }, 'Esperando os agentes designados terminarem.')
    },
    finalize: async (rootTaskId, status, result) => {
      const m = await import('../executor/runTask')
      await m.finalize(rootTaskId, status, result)
    },
    resumeRoot: (rootTaskId) => resumeRoot(rootTaskId),
    aggregate,
    replan,
    caps: DEFAULT_CAPS,
  }
}



export async function driverStep(rootTask: TaskRow, deps: DriverDeps): Promise<void> {
  const d = deps

  const plan = await d.getPlanByTask(rootTask.id)
  if (!plan) {
    
    await d.finalize(rootTask.id, 'failed', 'Plano da tarefa-raiz não encontrado.')
    return
  }

  
  let steps = await d.getSteps(plan.id)

  
  
  
  
  
  
  
  
  
  
  
  
  let replansFeitos = plan.replans
  let bloq = passosBloqueados(steps)
  while (bloq.length) {
    let replanejou = false
    if (replansFeitos < d.caps.maxReplans) {
      replanejou = await d.replan(rootTask, steps) 
      if (replanejou) replansFeitos = await d.incReplans(plan.id)
    }
    if (!replanejou) {
      for (const ord of bloq) {
        const s = steps.find((x) => x.ordinal === ord)
        if (s) await d.updateStep(s.id, { status: 'skipped' })
      }
    }
    steps = await d.getSteps(plan.id)
    bloq = passosBloqueados(steps)
  }

  
  if (tudoConcluido(steps)) {
    const sintese = await d.aggregate(rootTask, steps)
    await d.finalize(rootTask.id, 'done', sintese)
    await d.setPlanStatus(plan.id, 'done')
    void (d.notificarPlanoTerminal ?? notificarPlanoTerminal)({ planId: plan.id, objetivo: rootTask.objective, status: 'done', sintese })
    return
  }

  
  const filhos = await d.listChildTasks(rootTask.id)
  const gasto = filhos.reduce((acc, c) => acc + Number(c.spent_usd ?? 0), 0)
  if (orcamentoEstourado(gasto, rootTask.budget_usd)) {
    await d.finalize(rootTask.id, 'failed', 'Orçamento agregado do objetivo esgotado.')
    await d.setPlanStatus(plan.id, 'failed')
    void (d.notificarPlanoTerminal ?? notificarPlanoTerminal)({ planId: plan.id, objetivo: rootTask.objective, status: 'failed', sintese: 'Orçamento agregado do objetivo esgotado.' })
    return
  }

  
  
  
  
  const prontos = passosProntos(steps).slice(0, d.caps.maxChildrenPerWave)
  if (prontos.length === 0) return

  
  for (const ord of prontos) {
    const s = steps.find((x) => x.ordinal === ord)
    if (!s) continue
    const agentId = await d.ensureAgentForRole(s.role)
    const childId = await d.delegar(agentId, s.sub_objective, rootTask.id)
    await d.updateStep(s.id, { status: 'delegated', agent_id: agentId, child_task_id: childId })
  }

  
  
  
  
  
  await d.parkNeedsChildren(rootTask.id)
  const refrescados = await d.getSteps(plan.id)
  if (ondaCompleta(refrescados)) {
    await d.resumeRoot(rootTask.id)
  }
}
