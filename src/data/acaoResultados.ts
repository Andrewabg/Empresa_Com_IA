import { serverDb } from '../server/supabase'
import type { ResultadoAcao } from '@/lib/trafego/atribuicao'


export interface ResultadoAcaoRow {
  operator_id: string
  approval_id: string
  account_id: string
  entity_id: string
  nivel: string | null
  tipo: string
  metrica: string | null
  direcao: string | null
  entidade_antes: number | null
  entidade_depois: number | null
  conta_antes: number | null
  conta_depois: number | null
  delta_liquido: number | null
  veredito: string
  motivo: string | null
  acao_em: string | null
}


export async function insertResultadoAcao(row: ResultadoAcaoRow): Promise<void> {
  const { error } = await serverDb()
    .from('acao_resultados')
    .upsert(row, { onConflict: 'approval_id,entity_id', ignoreDuplicates: true })
  if (error) throw new Error(`insertResultadoAcao: ${error.message}`)
}


export async function listResultadosPorApprovals(approvalIds: string[]): Promise<ResultadoAcaoRow[]> {
  if (approvalIds.length === 0) return []
  const { data, error } = await serverDb()
    .from('acao_resultados')
    .select('operator_id, approval_id, account_id, entity_id, nivel, tipo, metrica, direcao, entidade_antes, entidade_depois, conta_antes, conta_depois, delta_liquido, veredito, motivo, acao_em')
    .in('approval_id', approvalIds)
  if (error) { console.warn('[listResultadosPorApprovals] fail-open:', error.message); return [] }
  return (data ?? []) as ResultadoAcaoRow[]
}


export async function listChavesMedidas(approvalIds: string[]): Promise<Set<string>> {
  if (approvalIds.length === 0) return new Set()
  const { data, error } = await serverDb()
    .from('acao_resultados')
    .select('approval_id, entity_id')
    .in('approval_id', approvalIds)
  if (error) { console.warn('[listChavesMedidas] fail-open:', error.message); return new Set() }
  return new Set((data ?? []).map((r) => `${(r as { approval_id: string }).approval_id}:${(r as { entity_id: string }).entity_id}`))
}


export function rowParaResultado(row: ResultadoAcaoRow): ResultadoAcao {
  return {
    veredito: row.veredito as ResultadoAcao['veredito'],
    motivo: row.motivo ?? '',
    ...(row.entidade_antes != null ? { entidadeAntes: row.entidade_antes } : {}),
    ...(row.entidade_depois != null ? { entidadeDepois: row.entidade_depois } : {}),
    ...(row.conta_antes != null ? { contaAntes: row.conta_antes } : {}),
    ...(row.conta_depois != null ? { contaDepois: row.conta_depois } : {}),
    ...(row.delta_liquido != null ? { deltaLiquido: row.delta_liquido } : {}),
  }
}
