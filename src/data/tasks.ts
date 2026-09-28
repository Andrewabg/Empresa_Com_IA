import { serverDb } from '../server/supabase'
import { registrarTransicao, type NovaTransicao } from './taskTransitions'
import { execucaoLeuTerceiro } from '../server/agent/turnContext'

export type TaskStatus = 'queued' | 'running' | 'needs_approval' | 'needs_children' | 'done' | 'failed' | 'cancelled'

export interface TaskRow {
  id: string
  agent_id: string
  created_by: string | null
  conversation_id: string | null
  objective: string
  status: TaskStatus
  parent_task_id: string | null
  budget_usd: number | null
  spent_usd: number
  steps: number
  working_state: unknown | null
  result: string | null
  approval_id: string | null
  plan_id: string | null
  operator_id: string | null
  campanha_id: string | null
  plano_index: number | null
  
  terceiro_ingerido?: boolean
  heartbeat_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateTaskInput {
  agent_id: string
  created_by?: string | null
  conversation_id?: string | null
  objective: string
  parent_task_id?: string | null
  budget_usd?: number | null
  operator_id?: string | null
  campanha_id?: string | null
  plano_index?: number | null
  
  terceiro_ingerido?: boolean
}

export type TaskPatch = Partial<
  Pick<TaskRow, 'status' | 'spent_usd' | 'steps' | 'working_state' | 'result' | 'approval_id' | 'plan_id' | 'heartbeat_at'>
>


async function registrarRastro(t: NovaTransicao): Promise<void> {
  try {
    await registrarTransicao(t)
  } catch (err) {
    console.warn('[tasks] rastro da transição falhou (não-fatal):', err)
  }
}


async function statusAtual(id: string): Promise<TaskStatus | null> {
  const { data, error } = await serverDb().from('tasks').select('status').eq('id', id).maybeSingle()
  if (error) return null
  return (data as { status: TaskStatus } | null)?.status ?? null
}

export async function createTask(input: CreateTaskInput): Promise<TaskRow> {
  const { data, error } = await serverDb()
    .from('tasks')
    .insert({
      agent_id: input.agent_id,
      created_by: input.created_by ?? null,
      conversation_id: input.conversation_id ?? null,
      objective: input.objective,
      parent_task_id: input.parent_task_id ?? null,
      budget_usd: input.budget_usd ?? null,
      operator_id: input.operator_id ?? null,
      campanha_id: input.campanha_id ?? null,
      plano_index: input.plano_index ?? null,
      
      
      
      terceiro_ingerido: input.terceiro_ingerido === true || execucaoLeuTerceiro(),
    })
    .select()
    .single()
  if (error) throw new Error(`createTask: ${error.message}`)
  const row = data as TaskRow
  await registrarRastro({ taskId: row.id, de: null, para: row.status, agentId: row.agent_id })
  return row
}

export async function getTask(id: string): Promise<TaskRow | null> {
  const { data, error } = await serverDb().from('tasks').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getTask: ${error.message}`)
  return (data as TaskRow | null) ?? null
}


export async function updateTask(id: string, patch: TaskPatch, motivo?: string): Promise<TaskRow> {
  
  
  const antes = patch.status ? await statusAtual(id) : null

  const { data, error } = await serverDb()
    .from('tasks')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`updateTask: ${error.message}`)
  const row = data as TaskRow

  if (patch.status && antes !== patch.status) {
    await registrarRastro({ taskId: id, de: antes, para: patch.status, motivo, agentId: row.agent_id })
  }
  return row
}


export async function claimTask(id: string, from: TaskStatus[], motivo?: string): Promise<TaskRow | null> {
  const now = new Date().toISOString()
  const { data, error } = await serverDb()
    .from('tasks')
    .update({ status: 'running', heartbeat_at: now, updated_at: now })
    .eq('id', id)
    .in('status', from)
    .select()
  if (error) throw new Error(`claimTask: ${error.message}`)
  const row = data && data.length === 1 ? (data[0] as TaskRow) : null
  
  
  if (row) {
    await registrarRastro({
      taskId: id, de: from.length === 1 ? from[0] : null, para: 'running', motivo, agentId: row.agent_id,
    })
  }
  return row
}

export async function listClaimableQueued(limit = 15): Promise<TaskRow[]> {
  const { data, error } = await serverDb()
    .from('tasks')
    .select()
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(`listClaimableQueued: ${error.message}`)
  return (data ?? []) as TaskRow[]
}


export async function listColdRunning(cutoffIso: string, limit = 15): Promise<TaskRow[]> {
  const { data, error } = await serverDb()
    .from('tasks')
    .select()
    .eq('status', 'running')
    .lt('heartbeat_at', cutoffIso)
    .order('heartbeat_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(`listColdRunning: ${error.message}`)
  return (data ?? []) as TaskRow[]
}


export async function listParkedRoots(): Promise<TaskRow[]> {
  const { data, error } = await serverDb()
    .from('tasks')
    .select()
    .eq('status', 'needs_children')
  if (error) throw new Error(`listParkedRoots: ${error.message}`)
  return (data ?? []) as TaskRow[]
}

const LIST_TASKS_COLS = 'id, agent_id, objective, status, parent_task_id, spent_usd, created_at, updated_at' as const

export type TaskListRow = Pick<TaskRow, 'id' | 'agent_id' | 'objective' | 'status' | 'parent_task_id' | 'spent_usd' | 'created_at' | 'updated_at'>


export type ObjetivoListRow = TaskListRow & { result: string | null }

export async function listTasksByAgent(agentId: string, limit = 50): Promise<TaskListRow[]> {
  const { data, error } = await serverDb()
    .from('tasks')
    .select(LIST_TASKS_COLS)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listTasksByAgent: ${error.message}`)
  return (data ?? []) as TaskListRow[]
}


export async function listLiveTasks(): Promise<TaskRow[]> {
  const { data, error } = await serverDb()
    .from('tasks')
    .select()
    .in('status', ['queued', 'running', 'needs_approval', 'needs_children'])
  if (error) throw new Error(`listLiveTasks: ${error.message}`)
  return (data ?? []) as TaskRow[]
}


export async function listarObjetivosRecentes(limit = 40): Promise<ObjetivoListRow[]> {
  const { data, error } = await serverDb()
    .from('tasks')
    .select(`${LIST_TASKS_COLS}, result`)
    .is('parent_task_id', null)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listarObjetivosRecentes: ${error.message}`)
  return (data ?? []) as ObjetivoListRow[]
}

export type FalhaRecente = Pick<TaskRow, 'id' | 'objective' | 'agent_id' | 'updated_at'>


export async function listarFalhasRecentes(cutoffIso: string, limit = 20): Promise<FalhaRecente[]> {
  const { data, error } = await serverDb()
    .from('tasks')
    .select('id, objective, agent_id, updated_at')
    .eq('status', 'failed')
    .gte('updated_at', cutoffIso)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listarFalhasRecentes: ${error.message}`)
  return (data ?? []) as FalhaRecente[]
}


export async function listarStatusDosFilhos(raizIds: string[]): Promise<Array<{ parent_task_id: string; status: TaskStatus }>> {
  if (raizIds.length === 0) return []
  const { data, error } = await serverDb()
    .from('tasks')
    .select('parent_task_id, status')
    .in('parent_task_id', raizIds)
  if (error) throw new Error(`listarStatusDosFilhos: ${error.message}`)
  return (data ?? []) as Array<{ parent_task_id: string; status: TaskStatus }>
}


export async function listarFamiliaDaTarefa(id: string): Promise<TaskRow[]> {
  const alvo = await getTask(id)
  if (!alvo) return []

  let raiz = alvo
  for (let i = 0; i < 10 && raiz.parent_task_id; i++) {
    const pai = await getTask(raiz.parent_task_id)
    if (!pai) break
    raiz = pai
  }

  const familia: TaskRow[] = [raiz]
  let fronteira = [raiz.id]
  for (let nivel = 0; nivel < 10 && fronteira.length > 0; nivel++) {
    const { data, error } = await serverDb().from('tasks').select().in('parent_task_id', fronteira)
    if (error) throw new Error(`listarFamiliaDaTarefa: ${error.message}`)
    const filhos = (data ?? []) as TaskRow[]
    const novos = filhos.filter((f) => !familia.some((x) => x.id === f.id))
    familia.push(...novos)
    fronteira = novos.map((f) => f.id)
  }
  return familia
}


export async function listChildTasks(parentId: string): Promise<TaskRow[]> {
  const { data, error } = await serverDb()
    .from('tasks')
    .select()
    .eq('parent_task_id', parentId)
  if (error) throw new Error(`listChildTasks: ${error.message}`)
  return (data ?? []) as TaskRow[]
}
