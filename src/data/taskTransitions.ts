import { serverDb } from '../server/supabase'
import type { TaskStatus } from './tasks'


const MAX_MOTIVO = 500

export interface TransitionRow {
  id: string
  task_id: string
  de: TaskStatus | null
  para: TaskStatus
  motivo: string | null
  agent_id: string | null
  at: string
}

export interface NovaTransicao {
  taskId: string
  de: TaskStatus | null
  para: TaskStatus
  motivo?: string | null
  agentId?: string | null
}


export async function registrarTransicao(t: NovaTransicao): Promise<void> {
  const motivo = t.motivo ? t.motivo.slice(0, MAX_MOTIVO) : null
  const { error } = await serverDb().from('task_transitions').insert({
    task_id: t.taskId,
    de: t.de,
    para: t.para,
    motivo,
    agent_id: t.agentId ?? null,
  })
  if (error) throw new Error(`registrarTransicao: ${error.message}`)
}


export async function listarTransicoes(taskIds: string[]): Promise<TransitionRow[]> {
  if (taskIds.length === 0) return []
  const { data, error } = await serverDb()
    .from('task_transitions')
    .select()
    .in('task_id', taskIds)
    .order('at', { ascending: true })
  if (error) throw new Error(`listarTransicoes: ${error.message}`)
  return (data ?? []) as TransitionRow[]
}


export async function podarTransicoes(dias = 90): Promise<number> {
  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await serverDb()
    .from('task_transitions')
    .delete()
    .lt('at', corte)
    .select('id')
  if (error) throw new Error(`podarTransicoes: ${error.message}`)
  return (data ?? []).length
}
