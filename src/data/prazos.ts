
import { serverDb } from '../server/supabase'
import type { PrazoTipo, PrazoStatus } from '@/lib/juridico/prazosTipos'

export interface PrazoRow {
  id: string; operator_id: string; agent_id: string; contrato_id: string | null
  tipo: string; titulo: string; data_alvo: string; janela_dias: number
  status: string; meta: Record<string, unknown>; created_at: string; updated_at: string
}
export interface NovoPrazo { contratoId: string | null; tipo: PrazoTipo; titulo: string; dataAlvo: string; janelaDias: number }

export async function listPrazos(operatorId: string, opts: { status?: PrazoStatus } = {}): Promise<PrazoRow[]> {
  let q = serverDb().from('prazos').select('*').eq('operator_id', operatorId)
  if (opts.status) q = q.eq('status', opts.status)
  const { data, error } = await q.order('data_alvo', { ascending: true })
  if (error) throw new Error(`listPrazos: ${error.message}`)
  return (data ?? []) as PrazoRow[]
}


export async function listPrazosAtivos(): Promise<PrazoRow[]> {
  const { data, error } = await serverDb().from('prazos').select('*').eq('status', 'ativo').order('data_alvo', { ascending: true })
  if (error) throw new Error(`listPrazosAtivos: ${error.message}`)
  return (data ?? []) as PrazoRow[]
}


type PrazoResumo = Pick<PrazoRow, 'id' | 'contrato_id' | 'tipo' | 'titulo' | 'data_alvo' | 'janela_dias' | 'status' | 'updated_at'>


export async function listPrazosAtivosParaVigilancia(): Promise<PrazoResumo[]> {
  const { data, error } = await serverDb()
    .from('prazos')
    .select('id, contrato_id, tipo, titulo, data_alvo, janela_dias, status, updated_at')
    .eq('status', 'ativo')
    .order('data_alvo', { ascending: true })
  if (error) throw new Error(`listPrazosAtivosParaVigilancia: ${error.message}`)
  return (data ?? []) as PrazoResumo[]
}

export async function createPrazos(operatorId: string, agentId: string, prazos: NovoPrazo[]): Promise<PrazoRow[]> {
  if (!prazos.length) return []
  const rows = prazos.map((p) => ({
    operator_id: operatorId, agent_id: agentId, contrato_id: p.contratoId,
    tipo: p.tipo, titulo: p.titulo, data_alvo: p.dataAlvo, janela_dias: p.janelaDias,
  }))
  const { data, error } = await serverDb().from('prazos').insert(rows).select('*')
  if (error) throw new Error(`createPrazos: ${error.message}`)
  return (data ?? []) as PrazoRow[]
}

export async function getPrazo(id: string, operatorId: string): Promise<PrazoRow | null> {
  const { data, error } = await serverDb().from('prazos').select('*').eq('id', id).eq('operator_id', operatorId).maybeSingle()
  if (error) throw new Error(`getPrazo: ${error.message}`)
  return (data as PrazoRow | null) ?? null
}

export async function updatePrazo(id: string, operatorId: string, patch: { status?: PrazoStatus; data_alvo?: string }): Promise<PrazoRow> {
  const { data, error } = await serverDb().from('prazos')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id).eq('operator_id', operatorId).select('*').single()
  if (error) throw new Error(`updatePrazo: ${error.message}`)
  return data as PrazoRow
}


export async function getPrazoQualquerOperador(id: string): Promise<PrazoRow | null> {
  const { data, error } = await serverDb().from('prazos').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`getPrazoQualquerOperador: ${error.message}`)
  return (data as PrazoRow | null) ?? null
}


export async function updatePrazoQualquerOperador(id: string, patch: { status?: PrazoStatus; data_alvo?: string }): Promise<PrazoRow> {
  const { data, error } = await serverDb().from('prazos')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id).select('*').single()
  if (error) throw new Error(`updatePrazoQualquerOperador: ${error.message}`)
  return data as PrazoRow
}
