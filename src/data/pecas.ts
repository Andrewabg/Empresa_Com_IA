import { serverDb } from '../server/supabase'
import { slotDaArte } from '@/lib/entrega/artes'
import type { Variacao, Veredito, Critica, PecaView } from '@/lib/estudio/types'
import type { AdPerf } from '@/lib/estudio/adPerf'
import { mergeBrief } from '@/lib/design/briefCoverage'
import type { BriefEstruturado } from '@/lib/design/types'
import { ultimaVersaoPorPeca } from '@/lib/design/ultimaVersao'

export type PecaStatus = 'brief' | 'rascunho' | 'revisao' | 'aprovada' | 'arquivada'

export type PecaOrigem = string

export interface PecaRow {
  id: string; operator_id: string; brand_id: string; agent_id: string
  formato: string; titulo: string; brief: Record<string, unknown>
  status: PecaStatus; origem: PecaOrigem; position: number
  created_at: string; updated_at: string
  ad_id: string | null
  ad_perf: AdPerf | null
  aprendido_ad_id: string | null
}
export interface PecaVersaoRow {
  id: string; peca_id: string; n: number
  variacoes: Variacao[]; veredito: Veredito; critica: Critica
  origem_revisao: string | null; created_at: string
}
export interface PecaComVersoes extends PecaRow { versoes: PecaVersaoRow[] }

export interface CreatePecaInput {
  operatorId: string; brandId: string; agentId: string
  formato: string; titulo?: string; brief?: Record<string, unknown>
  origem?: PecaOrigem; status?: PecaStatus; campanhaId?: string
}

export async function createPeca(input: CreatePecaInput): Promise<PecaRow> {
  
  const { data: last } = await serverDb().from('pecas')
    .select('position').eq('operator_id', input.operatorId).eq('brand_id', input.brandId)
    .order('position', { ascending: false }).limit(1).maybeSingle()
  const position = ((last?.position as number | undefined) ?? -1) + 1
  const { data, error } = await serverDb().from('pecas').insert({
    operator_id: input.operatorId, brand_id: input.brandId, agent_id: input.agentId,
    formato: input.formato, titulo: input.titulo ?? '', brief: input.brief ?? {},
    origem: input.origem ?? 'operador', status: input.status ?? 'rascunho', position,
    campanha_id: input.campanhaId ?? null,
  }).select('*').single()
  if (error) throw new Error(`createPeca: ${error.message}`)
  return data as PecaRow
}

export interface AppendVersaoInput {
  variacoes: Variacao[]; veredito: Veredito; critica: Critica; origemRevisao?: string
}

export async function appendVersao(pecaId: string, input: AppendVersaoInput): Promise<PecaVersaoRow> {
  
  const { data: last } = await serverDb().from('peca_versoes')
    .select('n').eq('peca_id', pecaId).order('n', { ascending: false }).limit(1).maybeSingle()
  const n = ((last?.n as number | undefined) ?? 0) + 1
  const { data, error } = await serverDb().from('peca_versoes').insert({
    peca_id: pecaId, n, variacoes: input.variacoes, veredito: input.veredito,
    critica: input.critica, origem_revisao: input.origemRevisao ?? null,
  }).select('*').single()
  if (error) throw new Error(`appendVersao: ${error.message}`)
  
  await serverDb().from('pecas').update({ updated_at: new Date().toISOString() }).eq('id', pecaId)
  return data as PecaVersaoRow
}


const FORMA_DE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getPecaComVersoes(pecaId: string): Promise<PecaComVersoes | null> {
  if (!FORMA_DE_UUID.test((pecaId ?? '').trim())) return null
  const { data: peca, error } = await serverDb().from('pecas').select('*').eq('id', pecaId).maybeSingle()
  if (error) throw new Error(`getPecaComVersoes: ${error.message}`)
  if (!peca) return null
  const { data: versoes, error: e2 } = await serverDb().from('peca_versoes')
    .select('*').eq('peca_id', pecaId).order('n', { ascending: true })
  if (e2) throw new Error(`getPecaComVersoes.versoes: ${e2.message}`)
  return { ...(peca as PecaRow), versoes: (versoes ?? []) as PecaVersaoRow[] }
}

export async function listPecas(operatorId: string, brandId: string, agentId?: string): Promise<PecaRow[]> {
  let q = serverDb().from('pecas')
    .select('*').eq('operator_id', operatorId).eq('brand_id', brandId)
  if (agentId) q = q.eq('agent_id', agentId)
  const { data, error } = await q.order('position', { ascending: true })
  if (error) throw new Error(`listPecas: ${error.message}`)
  return (data ?? []) as PecaRow[]
}

export interface PecaComUltimaVersao extends PecaRow { ultimaVersao: PecaVersaoRow | null }


export async function listPecasComUltimaVersao(
  operatorId: string, brandId: string, agentId?: string,
): Promise<PecaComUltimaVersao[]> {
  const pecas = await listPecas(operatorId, brandId, agentId)
  if (!pecas.length) return []
  const ids = pecas.map((p) => p.id)
  const { data, error } = await serverDb().from('peca_versoes')
    .select('*').in('peca_id', ids).order('peca_id').order('n', { ascending: true })
  if (error) throw new Error(`listPecasComUltimaVersao.versoes: ${error.message}`)
  const ultima = ultimaVersaoPorPeca((data ?? []) as PecaVersaoRow[])
  return pecas.map((p) => ({ ...p, ultimaVersao: ultima.get(p.id) ?? null }))
}

export async function setPecaStatus(pecaId: string, operatorId: string, status: PecaStatus): Promise<PecaRow> {
  const { data, error } = await serverDb().from('pecas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', pecaId).eq('operator_id', operatorId).select('*').single()
  if (error) throw new Error(`setPecaStatus: ${error.message}`)
  return data as PecaRow
}


export async function mergePecaBrief(
  pecaId: string, operatorId: string, patch: Partial<BriefEstruturado>, formato?: string,
): Promise<PecaComVersoes | null> {
  const full = await getPecaComVersoes(pecaId)
  if (!full || full.operator_id !== operatorId) return null
  const brief = mergeBrief((full.brief ?? {}) as BriefEstruturado, patch)
  const update: Record<string, unknown> = { brief, updated_at: new Date().toISOString() }
  if (formato && formato.trim()) update.formato = formato.trim()
  const { error } = await serverDb().from('pecas').update(update).eq('id', pecaId).eq('operator_id', operatorId)
  if (error) throw new Error(`mergePecaBrief: ${error.message}`)
  return { ...full, brief: brief as unknown as Record<string, unknown>, formato: (update.formato as string) ?? full.formato, updated_at: update.updated_at as string }
}


export async function setPecaNoAr(pecaId: string, operatorId: string, adId: string, adPerf: AdPerf | null): Promise<void> {
  const update: Record<string, unknown> = { ad_id: adId, updated_at: new Date().toISOString() }
  if (adPerf) update.ad_perf = adPerf
  const { error } = await serverDb().from('pecas')
    .update(update)
    .eq('id', pecaId).eq('operator_id', operatorId)
  if (error) throw new Error(`setPecaNoAr: ${error.message}`)
}

export async function clearPecaNoAr(pecaId: string, operatorId: string): Promise<void> {
  const { error } = await serverDb().from('pecas')
    .update({ ad_id: null, ad_perf: null, aprendido_ad_id: null, updated_at: new Date().toISOString() })
    .eq('id', pecaId).eq('operator_id', operatorId)
  if (error) throw new Error(`clearPecaNoAr: ${error.message}`)
}


export async function marcarPecaAprendida(pecaId: string, operatorId: string, adId: string): Promise<void> {
  const { error } = await serverDb().from('pecas')
    .update({ aprendido_ad_id: adId })
    .eq('id', pecaId).eq('operator_id', operatorId)
  if (error) throw new Error(`marcarPecaAprendida: ${error.message}`)
}


export interface GroundingCriativo { conceito?: string; headline?: string; subheadline?: string; formato?: string }

export async function lerGroundingDoCriativo(artifactId: string): Promise<GroundingCriativo | null> {
  const id = (artifactId ?? '').trim()
  if (!id) return null
  
  
  const { data, error } = await serverDb().from('peca_versoes')
    .select('variacoes, pecas!inner(formato)')
    .filter('variacoes', 'cs', JSON.stringify([{ artifactId: id }]))
    .limit(5)
  if (error) throw new Error(`lerGroundingDoCriativo: ${error.message}`)
  for (const row of (data ?? []) as Array<{ variacoes: unknown; pecas: { formato?: string } | { formato?: string }[] }>) {
    const vars = Array.isArray(row.variacoes) ? (row.variacoes as Array<Record<string, unknown>>) : []
    const v = vars.find((x) => x?.artifactId === id)
    if (!v) continue
    
    const pecaEmbed = Array.isArray(row.pecas) ? row.pecas[0] : row.pecas
    const formato = typeof pecaEmbed?.formato === 'string' ? pecaEmbed.formato : undefined
    const out: GroundingCriativo = {}
    if (typeof v.conceito === 'string' && v.conceito.trim()) out.conceito = v.conceito.trim()
    if (typeof v.headline === 'string' && v.headline.trim()) out.headline = v.headline.trim()
    if (typeof v.subheadline === 'string' && v.subheadline.trim()) out.subheadline = v.subheadline.trim()
    if (formato) out.formato = formato
    return out
  }
  return null
}


export async function pecaDoArtifact(artifactId: string): Promise<{ id: string; operator_id: string } | null> {
  const id = (artifactId ?? '').trim()
  if (!id) return null
  const { data, error } = await serverDb().from('peca_versoes')
    .select('variacoes, pecas!inner(id, operator_id)')
    .filter('variacoes', 'cs', JSON.stringify([{ artifactId: id }]))
    .limit(5)
  if (error) throw new Error(`pecaDoArtifact: ${error.message}`)
  for (const row of (data ?? []) as Array<{ variacoes: unknown; pecas: { id?: string; operator_id?: string } | { id?: string; operator_id?: string }[] }>) {
    const vars = Array.isArray(row.variacoes) ? (row.variacoes as Array<Record<string, unknown>>) : []
    if (!vars.some((x) => x?.artifactId === id)) continue
    const embed = Array.isArray(row.pecas) ? row.pecas[0] : row.pecas
    if (embed?.id && embed.operator_id) return { id: embed.id, operator_id: embed.operator_id }
  }
  return null
}


export async function listArtesDasEntregas(
  operatorId: string, campanhaIds: string[],
): Promise<Record<string, PecaComUltimaVersao[]>> {
  const ids = [...new Set((campanhaIds ?? []).filter(Boolean))]
  if (!ids.length) return {}
  const { data, error } = await serverDb().from('pecas')
    .select('*').eq('operator_id', operatorId).in('campanha_id', ids)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listArtesDasEntregas: ${error.message}`)
  const artes = ((data ?? []) as Array<PecaRow & { campanha_id: string | null }>)
    .filter((p) => slotDaArte(p.brief) !== null)
  if (!artes.length) return {}
  const { data: vs, error: e2 } = await serverDb().from('peca_versoes')
    .select('*').in('peca_id', artes.map((p) => p.id)).order('peca_id').order('n', { ascending: true })
  if (e2) throw new Error(`listArtesDasEntregas.versoes: ${e2.message}`)
  const ultima = ultimaVersaoPorPeca((vs ?? []) as PecaVersaoRow[])
  const out: Record<string, PecaComUltimaVersao[]> = {}
  for (const p of artes) {
    const chave = p.campanha_id ?? ''
    if (!chave) continue
    ;(out[chave] ??= []).push({ ...p, ultimaVersao: ultima.get(p.id) ?? null })
  }
  return out
}


export function toPecaView(full: PecaComVersoes): PecaView {
  const v = full.versoes[full.versoes.length - 1]
  return {
    id: full.id, brandId: full.brand_id, formato: full.formato, titulo: full.titulo,
    status: full.status, origem: full.origem, position: full.position,
    versaoAtual: v?.n ?? 0, variacoes: v?.variacoes ?? [], veredito: v?.veredito ?? {}, critica: v?.critica ?? {},
    adId: full.ad_id ?? undefined, adPerf: full.ad_perf ?? undefined,
    aprendido: full.aprendido_ad_id != null && full.aprendido_ad_id === full.ad_id,
  }
}
