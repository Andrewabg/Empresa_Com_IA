


import { serverDb } from '../server/supabase'
import { colunaAusente, avisarSchemaVelho } from '../lib/canais/schemaVelho'

export type IgJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'dead'

export interface IgJobRow {
  id: string; run_id: string; passo: number; status: IgJobStatus; nao_antes: string
  attempts: number; max_attempts: number; last_error: string | null
  heartbeat_at: string | null; created_at: string; updated_at: string
  
  claim_id: string | null
  
  esfriamentos: number
  
  passo_completo: boolean
}


function comMarca<T extends { eq: (col: string, val: string) => T }>(q: T, claimId?: string | null): T {
  return claimId ? q.eq('claim_id', claimId) : q
}


export async function agendarJobIg(
  runId: string, passo: number, naoAntesIso: string,
): Promise<{ jobId: string; novo: boolean }> {
  const db = serverDb()
  const { data, error } = await db.from('ig_jobs')
    .insert({ run_id: runId, passo, nao_antes: naoAntesIso }).select('id').single()
  if (!error) return { jobId: data.id as string, novo: true }
  if (error.code !== '23505') throw new Error(`agendarJobIg: ${error.message}`)

  const { data: vivo, error: e2 } = await db.from('ig_jobs')
    .select('id, status').eq('run_id', runId).in('status', ['queued', 'running']).maybeSingle()
  if (e2) throw new Error(`agendarJobIg: ${e2.message}`)
  if (!vivo) return agendarJobIg(runId, passo, naoAntesIso) 

  const semMarca = { nao_antes: naoAntesIso, passo, updated_at: new Date().toISOString() }
  const empurrar = (patch: Record<string, unknown>) => db.from('ig_jobs')
    .update(patch).eq('id', vivo.id).in('status', ['queued', 'running']).select('id')
  
  
  let empurrado: { id: string }[] | null = null
  let e3 = null as { code?: string | null; message: string } | null
  ;({ data: empurrado, error: e3 } = await empurrar({ ...semMarca, passo_completo: false }))
  if (e3 && colunaAusente(e3)) {
    
    
    
    avisarSchemaVelho('fila do Instagram (encadeamento)')
    ;({ data: empurrado, error: e3 } = await empurrar(semMarca))
  }
  if (e3) throw new Error(`agendarJobIg: ${e3.message}`)
  
  if ((empurrado ?? []).length === 0) return agendarJobIg(runId, passo, naoAntesIso)
  return { jobId: vivo.id as string, novo: false }
}


export async function concluirSeIntacto(
  id: string, naoAntesDoClaim: string, claimId?: string | null,
): Promise<boolean> {
  const { data, error } = await comMarca(serverDb().from('ig_jobs')
    .update({ status: 'done', updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'running').eq('nao_antes', naoAntesDoClaim), claimId).select('id')
  if (error) throw new Error(`concluirSeIntacto: ${error.message}`)
  return (data ?? []).length === 1
}

export async function getJobIg(id: string): Promise<IgJobRow | null> {
  const { data, error } = await serverDb().from('ig_jobs').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getJobIg: ${error.message}`)
  return (data as IgJobRow) ?? null
}

export async function claimJobIg(id: string, from: IgJobStatus[]): Promise<IgJobRow | null> {
  const now = new Date().toISOString()
  const semMarca = { status: 'running' as const, heartbeat_at: now, updated_at: now }
  const tentar = (patch: Record<string, unknown>) => serverDb().from('ig_jobs')
    .update(patch).eq('id', id).in('status', from).select()

  const { data, error } = await tentar({ ...semMarca, claim_id: crypto.randomUUID() })
  if (!error) return data && data.length === 1 ? (data[0] as IgJobRow) : null
  if (!colunaAusente(error)) throw new Error(`claimJobIg: ${error.message}`)

  
  
  
  
  avisarSchemaVelho('fila do Instagram (claim)')
  const r = await tentar(semMarca)
  if (r.error) throw new Error(`claimJobIg: ${r.error.message}`)
  return r.data && r.data.length === 1 ? (r.data[0] as IgJobRow) : null
}


export async function finishJobIg(
  id: string, status: 'done' | 'dead', lastError?: string, claimId?: string | null,
): Promise<boolean> {
  const { data, error } = await comMarca(serverDb().from('ig_jobs')
    .update({ status, last_error: lastError ?? null, updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'running'), claimId).select('id')
  if (error) throw new Error(`finishJobIg: ${error.message}`)
  return (data ?? []).length === 1
}


export async function requeueJobIg(
  id: string, attempts: number, lastError: string, naoAntesIso?: string,
  claimId?: string | null, esfriamentos?: number,
): Promise<boolean> {
  const antigo: Record<string, unknown> = {
    status: 'queued', attempts, last_error: lastError, updated_at: new Date().toISOString(),
  }
  if (naoAntesIso) antigo.nao_antes = naoAntesIso
  const novo: Record<string, unknown> = { ...antigo }
  if (esfriamentos != null) novo.esfriamentos = esfriamentos

  const escrever = (patch: Record<string, unknown>) => comMarca(serverDb().from('ig_jobs')
    .update(patch).eq('id', id).eq('status', 'running'), claimId).select('id')

  const { data, error } = await escrever(novo)
  if (!error) return (data ?? []).length === 1
  if (!colunaAusente(error)) throw new Error(`requeueJobIg: ${error.message}`)
  
  
  avisarSchemaVelho('fila do Instagram (devolucao)')
  const r = await escrever(antigo)
  if (r.error) throw new Error(`requeueJobIg: ${r.error.message}`)
  return (r.data ?? []).length === 1
}


export async function tocarHeartbeatJobIg(id: string, claimId?: string | null): Promise<boolean> {
  const { data, error } = await comMarca(serverDb().from('ig_jobs')
    .update({ heartbeat_at: new Date().toISOString() }).eq('id', id).eq('status', 'running'), claimId)
    .select('id')
  if (error) throw new Error(`tocarHeartbeatJobIg: ${error.message}`)
  return (data ?? []).length === 1
}


export async function devolverJobEncerradoIg(
  id: string, passo: number, attempts: number, lastError: string, claimId?: string | null,
): Promise<boolean> {
  const antigo = { status: 'queued', attempts, last_error: lastError, updated_at: new Date().toISOString() }
  const escrever = (patch: Record<string, unknown>) => comMarca(serverDb().from('ig_jobs')
    .update(patch)
    
    
    
    .eq('id', id).eq('passo', passo).eq('status', 'running'), claimId).select('id')

  const { data, error } = await escrever({ ...antigo, passo_completo: true })
  if (!error) return (data ?? []).length === 1
  if (!colunaAusente(error)) throw new Error(`devolverJobEncerradoIg: ${error.message}`)
  
  
  
  avisarSchemaVelho('fila do Instagram (devolucao carimbada)')
  const r = await escrever(antigo)
  if (r.error) throw new Error(`devolverJobEncerradoIg: ${r.error.message}`)
  return (r.data ?? []).length === 1
}


export async function agendarJobIgSeAusente(
  runId: string, passo: number, naoAntesIso: string,
): Promise<string | null> {
  const { data, error } = await serverDb().from('ig_jobs')
    .insert({ run_id: runId, passo, nao_antes: naoAntesIso, passo_completo: true })
    .select('id').single()
  if (!error) return data.id as string
  if (error.code === '23505') return null
  throw new Error(`agendarJobIgSeAusente: ${error.message}`)
}


export async function listClaimableIgJobs(cutoffIso: string, limite?: number): Promise<IgJobRow[]> {
  const q = serverDb().from('ig_jobs')
    .select().eq('status', 'queued').lte('nao_antes', cutoffIso).order('created_at', { ascending: true })
  const { data, error } = limite != null && limite > 0 ? await q.limit(limite) : await q
  if (error) throw new Error(`listClaimableIgJobs: ${error.message}`)
  return (data ?? []) as IgJobRow[]
}

export async function listColdIgJobs(cutoffIso: string, limite?: number): Promise<IgJobRow[]> {
  const q = serverDb().from('ig_jobs')
    .select().eq('status', 'running').lt('heartbeat_at', cutoffIso).order('heartbeat_at', { ascending: true })
  const { data, error } = limite != null && limite > 0 ? await q.limit(limite) : await q
  if (error) throw new Error(`listColdIgJobs: ${error.message}`)
  return (data ?? []) as IgJobRow[]
}
