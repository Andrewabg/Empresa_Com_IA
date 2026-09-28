import { serverDb } from '../server/supabase'

export type MemoryJobKind = 'reflect' | 'rollup' | 'reflect_task' | 'reflect_account' | 'reflect_juridico' | 'reflect_atendimento' | 'reflect_brand' | 'reflect_design' | 'reflect_peca' | 'reflect_kit' | 'entrevista_commit' | 'attribution'
export type MemoryJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'dead'

export interface MemoryJobRow {
  id: string
  kind: MemoryJobKind
  ref: string
  status: MemoryJobStatus
  attempts: number
  max_attempts: number
  last_error: string | null
  heartbeat_at: string | null
  created_at: string
  updated_at: string
}


export async function enqueueMemoryJob(kind: MemoryJobKind, ref: string): Promise<{ enqueued: boolean }> {
  const { error } = await serverDb().from('memory_jobs').insert({ kind, ref })
  if (error) {
    if (error.code === '23505') return { enqueued: false }
    throw new Error(`enqueueMemoryJob: ${error.message}`)
  }
  return { enqueued: true }
}


export async function claimMemoryJob(id: string, from: MemoryJobStatus[]): Promise<MemoryJobRow | null> {
  const now = new Date().toISOString()
  const { data, error } = await serverDb()
    .from('memory_jobs')
    .update({ status: 'running', heartbeat_at: now, updated_at: now })
    .eq('id', id)
    .in('status', from)
    .select()
  if (error) throw new Error(`claimMemoryJob: ${error.message}`)
  return data && data.length === 1 ? (data[0] as MemoryJobRow) : null
}


export async function finishMemoryJob(id: string, status: 'done' | 'dead', lastError?: string): Promise<void> {
  const { error } = await serverDb()
    .from('memory_jobs')
    .update({ status, last_error: lastError ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`finishMemoryJob: ${error.message}`)
}


export async function requeueMemoryJob(id: string, attempts: number, lastError: string): Promise<void> {
  const { error } = await serverDb()
    .from('memory_jobs')
    .update({ status: 'queued', attempts, last_error: lastError, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`requeueMemoryJob: ${error.message}`)
}

export async function listClaimableMemoryJobs(limit = 15): Promise<MemoryJobRow[]> {
  const { data, error } = await serverDb()
    .from('memory_jobs').select().eq('status', 'queued').order('created_at', { ascending: true }).limit(limit)
  if (error) throw new Error(`listClaimableMemoryJobs: ${error.message}`)
  return (data ?? []) as MemoryJobRow[]
}


export async function listColdMemoryJobs(cutoffIso: string, limit = 15): Promise<MemoryJobRow[]> {
  const { data, error } = await serverDb()
    .from('memory_jobs').select().eq('status', 'running').lt('heartbeat_at', cutoffIso).order('heartbeat_at', { ascending: true }).limit(limit)
  if (error) throw new Error(`listColdMemoryJobs: ${error.message}`)
  return (data ?? []) as MemoryJobRow[]
}


export async function refsComFalhaRecente(kind: MemoryJobKind, cutoffIso: string, limit = 200): Promise<Set<string>> {
  const { data, error } = await serverDb()
    .from('memory_jobs')
    .select('ref')
    .eq('kind', kind)
    .eq('status', 'dead')
    .gte('updated_at', cutoffIso)
    .limit(limit)
  if (error) throw new Error(`refsComFalhaRecente: ${error.message}`)
  return new Set(((data ?? []) as { ref: string }[]).map((r) => r.ref))
}


export async function existsRollupForDate(date: string): Promise<boolean> {
  const { data, error } = await serverDb()
    .from('memory_jobs').select('id')
    .eq('kind', 'rollup').eq('ref', date)
    .neq('status', 'dead')
    .limit(1)
  if (error) throw new Error(`existsRollupForDate: ${error.message}`)
  return (data ?? []).length > 0
}
