import { serverDb } from '../server/supabase'
import type { Desmontagem, SwipeView } from '@/lib/estudio/types'


export type SwipeOrigem = string

export interface SwipeRow {
  id: string; operator_id: string; brand_id: string; agent_id: string
  titulo: string; fonte: string | null; conteudo: string
  desmontagem: Desmontagem; tags: string[]; origem: SwipeOrigem; created_at: string
}

export interface CreateSwipeInput {
  operatorId: string; brandId: string; agentId: string
  titulo: string; fonte?: string; conteudo: string
  desmontagem?: Desmontagem; tags?: string[]; origem?: SwipeOrigem
}


export function toSwipeView(row: SwipeRow): SwipeView {
  return {
    id: row.id,
    brandId: row.brand_id,
    titulo: row.titulo,
    fonte: row.fonte ?? undefined,
    conteudo: row.conteudo,
    desmontagem: row.desmontagem,
    tags: row.tags,
    origem: row.origem,
    createdAt: row.created_at,
  }
}

export async function createSwipe(input: CreateSwipeInput): Promise<SwipeRow> {
  const { data, error } = await serverDb().from('swipes').insert({
    operator_id: input.operatorId, brand_id: input.brandId, agent_id: input.agentId,
    titulo: input.titulo, fonte: input.fonte ?? null, conteudo: input.conteudo,
    desmontagem: input.desmontagem ?? {}, tags: input.tags ?? [], origem: input.origem ?? 'copywriter',
  }).select('*').single()
  if (error) throw new Error(`createSwipe: ${error.message}`)
  return data as SwipeRow
}

export async function listSwipes(operatorId: string, brandId: string): Promise<SwipeRow[]> {
  const { data, error } = await serverDb().from('swipes')
    .select('*').eq('operator_id', operatorId).eq('brand_id', brandId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listSwipes: ${error.message}`)
  return (data ?? []) as SwipeRow[]
}

export async function getSwipe(id: string): Promise<SwipeRow | null> {
  const { data, error } = await serverDb().from('swipes').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`getSwipe: ${error.message}`)
  return (data as SwipeRow) ?? null
}

export async function deleteSwipe(id: string, operatorId: string): Promise<void> {
  const { error } = await serverDb().from('swipes').delete().eq('id', id).eq('operator_id', operatorId)
  if (error) throw new Error(`deleteSwipe: ${error.message}`)
}
