import { serverDb } from '../server/supabase'
import type { CampanhaStatus, CampanhaView, PlanoItem } from '@/lib/estudio/types'

export interface CampanhaRow {
  id: string; operator_id: string; brand_id: string; agent_id: string
  nome: string; brief: Record<string, unknown>; big_idea: string
  plano: PlanoItem[]; status: CampanhaStatus
  created_at: string; updated_at: string
}
export interface CreateCampanhaInput {
  operatorId: string; brandId: string; agentId: string
  nome: string; bigIdea?: string; brief?: Record<string, unknown>; plano: PlanoItem[]
  status?: CampanhaStatus
}


export function toCampanhaView(row: CampanhaRow): CampanhaView {
  return { id: row.id, brandId: row.brand_id, agentId: row.agent_id, nome: row.nome,
    bigIdea: row.big_idea, brief: row.brief, plano: row.plano, status: row.status, createdAt: row.created_at }
}

export async function createCampanha(input: CreateCampanhaInput): Promise<CampanhaRow> {
  const { data, error } = await serverDb().from('campanhas').insert({
    operator_id: input.operatorId, brand_id: input.brandId, agent_id: input.agentId,
    nome: input.nome, big_idea: input.bigIdea ?? '', brief: input.brief ?? {},
    plano: input.plano, status: input.status ?? 'planejada',
  }).select('*').single()
  if (error) throw new Error(`createCampanha: ${error.message}`)
  return data as CampanhaRow
}

export async function getCampanha(id: string): Promise<CampanhaRow | null> {
  const { data, error } = await serverDb().from('campanhas').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`getCampanha: ${error.message}`)
  return (data as CampanhaRow | null) ?? null
}

export async function listCampanhas(operatorId: string, brandId: string): Promise<CampanhaRow[]> {
  const { data, error } = await serverDb().from('campanhas')
    .select('*').eq('operator_id', operatorId).eq('brand_id', brandId).order('created_at', { ascending: false })
  if (error) throw new Error(`listCampanhas: ${error.message}`)
  return (data ?? []) as CampanhaRow[]
}


export async function listCampanhasComArtePendente(limite = 40): Promise<CampanhaRow[]> {
  const { data, error } = await serverDb().from('campanhas')
    .select('*').neq('status', 'arquivada')
    .order('updated_at', { ascending: false }).limit(limite)
  if (error) throw new Error(`listCampanhasComArtePendente: ${error.message}`)
  return (data ?? []) as CampanhaRow[]
}


export async function updateCampanhaPlanoItem(id: string, index: number, patch: Partial<PlanoItem>): Promise<CampanhaRow> {
  const { data, error } = await serverDb().rpc('set_plano_item', { p_id: id, p_index: index, p_patch: patch })
  if (error) throw new Error(`updateCampanhaPlanoItem: ${error.message}`)
  if (!data) throw new Error(`updateCampanhaPlanoItem: campanha ${id} não existe`)
  return data as CampanhaRow
}

export async function setCampanhaStatus(id: string, status: CampanhaStatus): Promise<CampanhaRow> {
  const { data, error } = await serverDb().from('campanhas')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  if (error) throw new Error(`setCampanhaStatus: ${error.message}`)
  return data as CampanhaRow
}

export async function deleteCampanha(id: string, operatorId: string): Promise<void> {
  const { error } = await serverDb().from('campanhas').delete().eq('id', id).eq('operator_id', operatorId)
  if (error) throw new Error(`deleteCampanha: ${error.message}`)
}
