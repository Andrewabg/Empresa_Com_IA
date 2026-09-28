import { serverDb } from '../server/supabase'
import type { ContratoKind, ContratoStatus, ParteContrato, Parecer } from '@/lib/juridico/types'

export interface ContratoRow {
  id: string; operator_id: string; agent_id: string
  kind: ContratoKind; tipo: string; titulo: string
  partes: unknown; status: ContratoStatus
  texto: string; texto_original: string | null; arquivo_ref: string | null
  parecer: unknown; meta: Record<string, unknown>
  versao_atual: number; created_at: string; updated_at: string
}

export interface CreateContratoInput {
  operatorId: string; agentId?: string
  kind: ContratoKind; tipo: string; titulo: string
  partes?: ParteContrato[]; status?: ContratoStatus
  textoOriginal?: string; arquivoRef?: string
  meta?: Record<string, unknown>
}

export async function createContrato(input: CreateContratoInput): Promise<ContratoRow> {
  const { data, error } = await serverDb().from('contratos').insert({
    operator_id: input.operatorId, agent_id: input.agentId ?? 'juridico',
    kind: input.kind, tipo: input.tipo, titulo: input.titulo,
    partes: input.partes ?? [], status: input.status ?? 'rascunho',
    texto_original: input.textoOriginal ?? null, arquivo_ref: input.arquivoRef ?? null,
    meta: input.meta ?? {},
  }).select('*').single()
  if (error) throw new Error(`createContrato: ${error.message}`)
  return data as ContratoRow
}


export async function appendContratoVersao(contratoId: string, input: { texto: string; nota?: string }): Promise<{ n: number }> {
  const { data: last } = await serverDb().from('contrato_versoes')
    .select('numero').eq('contrato_id', contratoId).order('numero', { ascending: false }).limit(1).maybeSingle()
  const n = ((last?.numero as number | undefined) ?? 0) + 1
  const { error } = await serverDb().from('contrato_versoes').insert({ contrato_id: contratoId, numero: n, texto: input.texto, nota: input.nota ?? null })
  if (error) throw new Error(`appendContratoVersao: ${error.message}`)
  
  
  
  const { error: e2 } = await serverDb().from('contratos')
    .update({ texto: input.texto, versao_atual: n, parecer: null, updated_at: new Date().toISOString() }).eq('id', contratoId)
  if (e2) throw new Error(`appendContratoVersao.bump: ${e2.message}`)
  return { n }
}

export async function getContrato(id: string, operatorId: string): Promise<ContratoRow | null> {
  const { data, error } = await serverDb().from('contratos').select('*').eq('id', id).eq('operator_id', operatorId).maybeSingle()
  if (error) throw new Error(`getContrato: ${error.message}`)
  return (data as ContratoRow | null) ?? null
}

export async function listContratos(operatorId: string, agentId?: string): Promise<ContratoRow[]> {
  let q = serverDb().from('contratos').select('*').eq('operator_id', operatorId)
  if (agentId) q = q.eq('agent_id', agentId)
  const { data, error } = await q.order('updated_at', { ascending: false })
  if (error) throw new Error(`listContratos: ${error.message}`)
  return (data ?? []) as ContratoRow[]
}


export async function getModeloDaCasa(operatorId: string, tipo: string): Promise<ContratoRow | null> {
  const { data, error } = await serverDb().from('contratos').select('*')
    .eq('operator_id', operatorId).eq('kind', 'modelo').eq('tipo', tipo).neq('status', 'arquivado')
    .order('updated_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(`getModeloDaCasa: ${error.message}`)
  return (data as ContratoRow | null) ?? null
}

export async function setContratoStatus(id: string, operatorId: string, status: ContratoStatus): Promise<ContratoRow> {
  const { data, error } = await serverDb().from('contratos')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id).eq('operator_id', operatorId).select('*').single()
  if (error) throw new Error(`setContratoStatus: ${error.message}`)
  return data as ContratoRow
}


export async function gravarParecer(id: string, operatorId: string, parecer: Parecer, marcarAnalisado = true): Promise<ContratoRow> {
  const patch: Record<string, unknown> = { parecer, updated_at: new Date().toISOString() }
  if (marcarAnalisado) patch.status = 'analisado'
  const { data, error } = await serverDb().from('contratos')
    .update(patch)
    .eq('id', id).eq('operator_id', operatorId).select('*').single()
  if (error) throw new Error(`gravarParecer: ${error.message}`)
  return data as ContratoRow
}


export async function mergeContratoMeta(id: string, operatorId: string, patch: Record<string, unknown>): Promise<ContratoRow> {
  const atual = await getContrato(id, operatorId)
  if (!atual) throw new Error('mergeContratoMeta: contrato não encontrado')
  const { data, error } = await serverDb().from('contratos')
    .update({ meta: { ...atual.meta, ...patch }, updated_at: new Date().toISOString() })
    .eq('id', id).eq('operator_id', operatorId).select('*').single()
  if (error) throw new Error(`mergeContratoMeta: ${error.message}`)
  return data as ContratoRow
}

export async function setArquivoRef(id: string, operatorId: string, ref: string): Promise<void> {
  const { error } = await serverDb().from('contratos')
    .update({ arquivo_ref: ref, updated_at: new Date().toISOString() }).eq('id', id).eq('operator_id', operatorId)
  if (error) throw new Error(`setArquivoRef: ${error.message}`)
}
