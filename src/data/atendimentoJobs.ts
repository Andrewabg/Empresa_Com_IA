
import { serverDb } from '../server/supabase'
import { colunaAusente, avisarSchemaVelho } from '../lib/canais/schemaVelho'

export type AtendimentoJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'dead'
export interface AtendimentoJobRow {
  id: string; conversa_id: string; status: AtendimentoJobStatus; nao_antes: string
  attempts: number; max_attempts: number; last_error: string | null
  heartbeat_at: string | null; created_at: string; updated_at: string
  
  claim_id: string | null
  
  esfriamentos: number
}


export interface DonoDoJob { readonly claimId: string | null }


export function marcaDe(job: { claim_id?: string | null }): DonoDoJob {
  
  
  return { claimId: job.claim_id ?? null }
}


export const SEM_MARCA: DonoDoJob = { claimId: null }


function comMarca<T extends { eq: (col: string, val: string) => T }>(q: T, dono: DonoDoJob): T {
  return dono.claimId ? q.eq('claim_id', dono.claimId) : q
}


export async function agendarJobConversa(conversaId: string, naoAntesIso: string): Promise<{ jobId: string; novo: boolean }> {
  const db = serverDb()
  const { data, error } = await db.from('atendimento_jobs')
    .insert({ conversa_id: conversaId, nao_antes: naoAntesIso }).select('id').single()
  if (!error) return { jobId: data.id as string, novo: true }
  if (error.code !== '23505') throw new Error(`agendarJobConversa: ${error.message}`)
  const { data: live, error: e2 } = await db.from('atendimento_jobs')
    .select('id, status').eq('conversa_id', conversaId).in('status', ['queued', 'running']).maybeSingle()
  if (e2) throw new Error(`agendarJobConversa: ${e2.message}`)
  if (!live) return agendarJobConversa(conversaId, naoAntesIso) 
  const { data: pushed, error: e3 } = await db.from('atendimento_jobs')
    .update({ nao_antes: naoAntesIso, updated_at: new Date().toISOString() })
    .eq('id', live.id).in('status', ['queued', 'running']).select('id')
  if (e3) throw new Error(`agendarJobConversa: ${e3.message}`)
  
  
  
  if ((pushed ?? []).length === 0) return agendarJobConversa(conversaId, naoAntesIso)
  return { jobId: live.id as string, novo: false }
}

export async function concluirSeIntacto(id: string, naoAntesDoClaim: string, dono: DonoDoJob): Promise<boolean> {
  const { data, error } = await comMarca(serverDb().from('atendimento_jobs')
    .update({ status: 'done', updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'running').eq('nao_antes', naoAntesDoClaim), dono).select('id')
  if (error) throw new Error(`concluirSeIntacto: ${error.message}`)
  return (data ?? []).length === 1
}
export async function getAtendimentoJob(id: string): Promise<AtendimentoJobRow | null> {
  const { data, error } = await serverDb().from('atendimento_jobs').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getAtendimentoJob: ${error.message}`)
  return (data as AtendimentoJobRow) ?? null
}
export async function claimAtendimentoJob(id: string, from: AtendimentoJobStatus[]): Promise<AtendimentoJobRow | null> {
  const now = new Date().toISOString()
  const semMarca = { status: 'running' as const, heartbeat_at: now, updated_at: now }
  const tentar = (patch: Record<string, unknown>) => serverDb().from('atendimento_jobs')
    .update(patch).eq('id', id).in('status', from).select()

  const { data, error } = await tentar({ ...semMarca, claim_id: crypto.randomUUID() })
  if (!error) return data && data.length === 1 ? (data[0] as AtendimentoJobRow) : null
  if (!colunaAusente(error)) throw new Error(`claimAtendimentoJob: ${error.message}`)

  
  
  
  avisarSchemaVelho('fila de atendimento (claim)')
  const r = await tentar(semMarca)
  if (r.error) throw new Error(`claimAtendimentoJob: ${r.error.message}`)
  return r.data && r.data.length === 1 ? (r.data[0] as AtendimentoJobRow) : null
}

export async function finishAtendimentoJob(id: string, status: 'done' | 'dead', dono: DonoDoJob, lastError?: string): Promise<boolean> {
  const { data, error } = await comMarca(serverDb().from('atendimento_jobs')
    .update({ status, last_error: lastError ?? null, updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'running'), dono).select('id')
  if (error) throw new Error(`finishAtendimentoJob: ${error.message}`)
  return (data ?? []).length === 1
}

export async function requeueAtendimentoJob(
  id: string, attempts: number, lastError: string, dono: DonoDoJob,
  naoAntesIso?: string, esfriamentos?: number,
): Promise<boolean> {
  const antigo: Record<string, unknown> = { status: 'queued', attempts, last_error: lastError, updated_at: new Date().toISOString() }
  if (naoAntesIso) antigo.nao_antes = naoAntesIso
  
  
  
  
  const novo: Record<string, unknown> = { ...antigo, claim_id: null }
  if (esfriamentos != null) novo.esfriamentos = esfriamentos

  const escrever = (patch: Record<string, unknown>) => comMarca(serverDb().from('atendimento_jobs')
    .update(patch).eq('id', id).eq('status', 'running'), dono).select('id')

  const { data, error } = await escrever(novo)
  if (!error) return (data ?? []).length === 1
  if (!colunaAusente(error)) throw new Error(`requeueAtendimentoJob: ${error.message}`)

  
  
  avisarSchemaVelho('fila de atendimento (devolução)')
  const r = await escrever(antigo)
  if (r.error) throw new Error(`requeueAtendimentoJob: ${r.error.message}`)
  return (r.data ?? []).length === 1
}

export async function tocarHeartbeatJob(id: string, dono: DonoDoJob): Promise<boolean> {
  const { data, error } = await comMarca(serverDb().from('atendimento_jobs')
    .update({ heartbeat_at: new Date().toISOString() }).eq('id', id).eq('status', 'running'), dono)
    .select('id')
  if (error) throw new Error(`tocarHeartbeatJob: ${error.message}`)
  return (data ?? []).length === 1
}

export async function listClaimableAtendimentoJobs(cutoffIso: string, limite?: number): Promise<AtendimentoJobRow[]> {
  const q = serverDb().from('atendimento_jobs')
    .select().eq('status', 'queued').lte('nao_antes', cutoffIso).order('created_at', { ascending: true })
  const { data, error } = limite != null && limite > 0 ? await q.limit(limite) : await q
  if (error) throw new Error(`listClaimableAtendimentoJobs: ${error.message}`)
  return (data ?? []) as AtendimentoJobRow[]
}

export async function listColdAtendimentoJobs(cutoffIso: string, limite?: number): Promise<AtendimentoJobRow[]> {
  const q = serverDb().from('atendimento_jobs')
    .select().eq('status', 'running').lt('heartbeat_at', cutoffIso).order('heartbeat_at', { ascending: true })
  const { data, error } = limite != null && limite > 0 ? await q.limit(limite) : await q
  if (error) throw new Error(`listColdAtendimentoJobs: ${error.message}`)
  return (data ?? []) as AtendimentoJobRow[]
}
