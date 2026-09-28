









import type { ContaSnapshot } from '@/lib/google-ads/audit'
import { avaliarTamanhoGrupo } from '@/lib/google-ads/structure'




export function queryConversionActions(): string {
  return [
    'SELECT conversion_action.id, conversion_action.name,',
    'conversion_action.status, conversion_action.type,',
    'conversion_action.include_in_conversions_metric',
    'FROM conversion_action',
    "WHERE conversion_action.status != 'REMOVED'",
  ].join(' ')
}


export function queryAnunciosReprovados(): string {
  return [
    'SELECT ad_group_ad.ad.id, ad_group_ad.policy_summary.approval_status,',
    'campaign.id, campaign.name, ad_group.id',
    'FROM ad_group_ad',
    "WHERE ad_group_ad.policy_summary.approval_status = 'DISAPPROVED'",
    "AND ad_group_ad.status != 'REMOVED'",
    "AND campaign.status != 'REMOVED'",
  ].join(' ')
}


export function queryNegativas(): string {
  return [
    'SELECT shared_set.id, shared_set.name, shared_set.type, shared_set.member_count',
    'FROM shared_set',
    "WHERE shared_set.type = 'NEGATIVE_KEYWORDS'",
    "AND shared_set.status != 'REMOVED'",
  ].join(' ')
}


export function queryGruposStag(): string {
  return [
    'SELECT ad_group.id, ad_group.name, campaign.id,',
    'ad_group_criterion.criterion_id, ad_group_criterion.type',
    'FROM ad_group_criterion',
    "WHERE ad_group_criterion.type = 'KEYWORD'",
    "AND ad_group_criterion.status != 'REMOVED'",
    "AND ad_group.status != 'REMOVED'",
    "AND campaign.status != 'REMOVED'",
  ].join(' ')
}




export interface ConversionActionRow {
  id: string
  name: string
}


export interface AnuncioReprovadoRow {
  campaignId: string
}


export interface NegativaRow {
  name: string
  type: string
}


export interface GrupoStagRow {
  adGroupId: string
  keywordCount: number
}


export interface ResultadosAuditoria {
  conversionActions: ConversionActionRow[]
  anunciosReprovados: AnuncioReprovadoRow[]
  negativas: NegativaRow[]
  gruposStag: GrupoStagRow[]
}




export function montarSnapshot(resultados: ResultadosAuditoria): ContaSnapshot {
  
  const temConversaoConfigurada = resultados.conversionActions.length > 0

  
  const campanhasUnicas = new Set(resultados.anunciosReprovados.map((r) => r.campaignId))
  const campanhasComAnuncioReprovado = campanhasUnicas.size

  
  const temNegativas = resultados.negativas.length > 0

  
  const gruposForaStag = resultados.gruposStag.filter(
    (g) => avaliarTamanhoGrupo(g.keywordCount) !== 'ok',
  ).length

  
  
  const conflitosKeyword = 0

  return {
    temConversaoConfigurada,
    campanhasComAnuncioReprovado,
    temNegativas,
    conflitosKeyword,
    gruposForaStag,
    
    
  }
}








function flattenResults(batches: unknown): Record<string, unknown>[] {
  if (!Array.isArray(batches)) return []
  const out: Record<string, unknown>[] = []
  for (const batch of batches) {
    if (!batch || typeof batch !== 'object') continue
    const results = (batch as Record<string, unknown>)['results']
    if (!Array.isArray(results)) continue
    for (const row of results) {
      if (row && typeof row === 'object') out.push(row as Record<string, unknown>)
    }
  }
  return out
}

const asStr = (v: unknown): string => (v == null ? '' : String(v))
const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})


export function parseConversionActions(batches: unknown): ConversionActionRow[] {
  return flattenResults(batches).map((r) => {
    const ca = asObj(r['conversionAction'])
    return { id: asStr(ca['id']), name: asStr(ca['name']) }
  })
}


export function parseAnunciosReprovados(batches: unknown): AnuncioReprovadoRow[] {
  return flattenResults(batches).map((r) => {
    const camp = asObj(r['campaign'])
    return { campaignId: asStr(camp['id']) }
  })
}


export function parseNegativas(batches: unknown): NegativaRow[] {
  return flattenResults(batches).map((r) => {
    const ss = asObj(r['sharedSet'])
    return { name: asStr(ss['name']), type: asStr(ss['type']) }
  })
}


export function parseGruposStag(batches: unknown): GrupoStagRow[] {
  const contagem = new Map<string, number>()
  for (const r of flattenResults(batches)) {
    const id = asStr(asObj(r['adGroup'])['id'])
    if (!id) continue
    contagem.set(id, (contagem.get(id) ?? 0) + 1)
  }
  return [...contagem.entries()].map(([adGroupId, keywordCount]) => ({ adGroupId, keywordCount }))
}


export function parseNomeConta(batches: unknown): string {
  const primeiro = flattenResults(batches)[0]
  if (!primeiro) return ''
  return asStr(asObj(primeiro['customer'])['descriptiveName'])
}


export function queryCustomerInfo(): string {
  return 'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer'
}
