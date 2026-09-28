
import { runAction as runActionDefault } from '../../actions/actions'
import { metaGraphGet, composioUserId } from '../../actions/composio'
import {
  createSnapshot as createSnapshotDefault,
  listLatestSnapshots as listLatestSnapshotsDefault,
  type SnapshotRow,
} from '@/data/trafego'
import { normalize, parseAdsetEntity, parseCampaignEntity, PURCHASE_TYPES, type AdsetEntity, type CampaignEntity } from '@/lib/trafego/normalize'
import { parseAccountHealth, parseAdReview } from '@/lib/trafego/saudeConta'
import { parsePublicoEstimado, type PublicoEstimado } from '@/lib/trafego/publicoEstimado'
import { parseHoras, type LinhaHora } from '@/lib/trafego/hora'
import type { SegmentoInput } from '@/lib/trafego/breakdown'
import { detectarFadiga } from '@/lib/trafego/diagnostico'
import { vazamentoCurto } from '@/lib/trafego/grounding'
import type { MetricShape } from '@/lib/trafego/types'
import { fmtBRL, fmtPct } from '@/lib/trafego/format'
import { getSetting } from '@/data/settings'

export type Nivel = 'account' | 'campaign' | 'adset' | 'ad'


export const ACCOUNT_SETTING_KEY = 'trafego_conta_selecionada'

export interface Periodo {
  preset?: string
  range?: { since: string; until: string }
}

export interface BuscarMetricasInput {
  periodo?: Periodo
  nivel?: Nivel
  
  entidade?: string
}

export interface BuscarMetricasCtx {
  actingAgentId?: string
  operatorId?: string
}

export interface BuscarMetricasDeps {
  runAction?: typeof runActionDefault
  createSnapshot?: typeof createSnapshotDefault
  
  listLatestSnapshots?: typeof listLatestSnapshotsDefault
  
  getAccountId?: (ctx: BuscarMetricasCtx, run: typeof runActionDefault) => Promise<string | null>
  
  getPreferredAccountId?: () => Promise<string | null>
}

const INSIGHTS_SLUG = 'METAADS_GET_INSIGHTS'
const ACCOUNTS_SLUG = 'METAADS_GET_AD_ACCOUNTS'
const DEFAULT_PRESET = 'last_7d'


const METRIC_FIELDS = [
  'spend', 'impressions', 'reach', 'frequency', 'clicks', 'ctr', 'cpc', 'cpm',
  'actions', 'action_values', 'purchase_roas', 'cost_per_action_type',
  'account_name', 'campaign_name', 'adset_name', 'ad_name',
  'campaign_id', 'adset_id', 'ad_id', 
  'video_play_actions', 'video_thruplay_watched_actions',
] as const

const NIVEL_LABEL: Record<Nivel, string> = {
  account: 'conta', campaign: 'campanhas', adset: 'conjuntos', ad: 'anúncios',
}
const PRESET_LABEL: Record<string, string> = {
  today: 'hoje', yesterday: 'ontem', last_7d: 'últimos 7 dias',
  last_14d: 'últimos 14 dias', last_30d: 'últimos 30 dias', this_month: 'este mês',
  last_month: 'mês passado', maximum: 'período máximo',
}

interface Envelope {
  data?: { data?: unknown[]; message?: unknown; [k: string]: unknown }
  error?: string | null
  successful?: boolean
}

function str(x: unknown): string | undefined {
  return typeof x === 'string' && x !== '' ? x : undefined
}

function periodoLabel(p?: Periodo): string {
  if (p?.range) return `${p.range.since} a ${p.range.until}`
  return PRESET_LABEL[p?.preset ?? DEFAULT_PRESET] ?? (p?.preset ?? DEFAULT_PRESET)
}


const VALID_PRESETS = new Set([
  'today', 'yesterday', 'last_7d', 'last_30d', 'this_month', 'last_month', 'this_quarter',
])

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}


function buildInsightsArgs(objectId: string, nivel: Nivel, periodo?: Periodo): Record<string, unknown> {
  const args: Record<string, unknown> = { object_id: objectId, level: nivel, fields: [...METRIC_FIELDS] }
  if (periodo?.range) {
    args.time_range = { since: periodo.range.since, until: periodo.range.until }
    return args
  }
  const preset = periodo?.preset ?? DEFAULT_PRESET
  if (VALID_PRESETS.has(preset)) args.date_preset = preset
  else args.time_range = { since: isoDaysAgo(395), until: isoDaysAgo(0) }
  return args
}


function entityOf(row: Record<string, unknown>, nivel: Nivel, fallbackId: string): { id: string; name: string | null } {
  switch (nivel) {
    case 'account': return { id: str(row.account_id) ?? fallbackId, name: str(row.account_name) ?? null }
    case 'campaign': return { id: str(row.campaign_id) ?? fallbackId, name: str(row.campaign_name) ?? null }
    case 'adset': return { id: str(row.adset_id) ?? fallbackId, name: str(row.adset_name) ?? null }
    case 'ad': return { id: str(row.ad_id) ?? fallbackId, name: str(row.ad_name) ?? null }
  }
}

export interface AdAccount {
  id: string
  name: string | null
}


export async function discoverAllAccounts(ctx: BuscarMetricasCtx, run: typeof runActionDefault): Promise<AdAccount[]> {
  const res = (await run({ slug: ACCOUNTS_SLUG, args: {}, userId: composioUserId(), agent: ctx.actingAgentId ?? 'jarvis' })) as Envelope
  if (!res.successful || res.error) return []
  const rows = Array.isArray(res.data?.data) ? (res.data!.data as Record<string, unknown>[]) : []
  const out: AdAccount[] = []
  for (const r of rows) {
    const id = str(r.id) ?? (str(r.account_id) ? `act_${str(r.account_id)}` : undefined)
    if (id) out.push({ id, name: str(r.name) ?? null })
  }
  return out
}


export function resolveAccountId(accounts: AdAccount[], preferredId?: string | null): string | null {
  if (accounts.length === 0) return null
  if (preferredId && accounts.some((a) => a.id === preferredId)) return preferredId
  return accounts[0].id
}


export async function discoverAccountId(ctx: BuscarMetricasCtx, run: typeof runActionDefault): Promise<string | null> {
  return resolveAccountId(await discoverAllAccounts(ctx, run))
}


export async function resolverContaParaAcao(
  agent: string,
  run: typeof runActionDefault,
  getSetting: (key: string) => Promise<string | null>,
  descobrir: (ctx: BuscarMetricasCtx, run: typeof runActionDefault) => Promise<string | null> = discoverAccountId,
): Promise<string | null> {
  const preferred = await getSetting(ACCOUNT_SETTING_KEY).catch(() => null)
  if (preferred) return preferred
  return descobrir({ actingAgentId: agent }, run)
}

const ADSETS_SLUG = 'METAADS_READ_ADSETS'
const ADSET_ENTITY_FIELDS = 'id,name,effective_status,configured_status,learning_stage_info,daily_budget,lifetime_budget,budget_remaining,optimization_goal'


export async function lerAdsetsEntity(
  accountId: string, run: typeof runActionDefault, agent: string,
): Promise<Record<string, AdsetEntity>> {
  try {
    const res = (await run({ slug: ADSETS_SLUG, args: { object_id: accountId, fields: ADSET_ENTITY_FIELDS, limit: 100 }, userId: composioUserId(), agent })) as Envelope
    if (!res.successful || res.error) return {}
    const rows = Array.isArray(res.data?.data) ? (res.data!.data as Record<string, unknown>[]) : []
    const out: Record<string, AdsetEntity> = {}
    for (const r of rows) {
      const id = str(r.id)
      if (id) out[id] = parseAdsetEntity(r)
    }
    return out
  } catch (e) {
    console.warn('[lerAdsetsEntity] falhou (fail-open):', e); return {}
  }
}


export async function lerPublicoEstimado(
  adsetId: string,
  deps: { graphGet?: typeof metaGraphGet } = {},
): Promise<PublicoEstimado | null> {
  try {
    const g = await (deps.graphGet ?? metaGraphGet)(
      `/${adsetId}/delivery_estimate?fields=estimate_dau,estimate_mau_lower_bound,estimate_mau_upper_bound,estimate_ready`,
    )
    return parsePublicoEstimado(g)
  } catch (e) {
    console.warn('[lerPublicoEstimado] falhou (fail-open):', e); return null
  }
}

const CAMPAIGN_ENTITY_FIELDS = 'id,name,effective_status,daily_budget,lifetime_budget,budget_remaining,bid_strategy,advantage_state'


export async function lerCampaignsEntity(
  accountId: string,
  deps: { graphGet?: typeof metaGraphGet } = {},
): Promise<Record<string, CampaignEntity>> {
  const graphGet = deps.graphGet ?? metaGraphGet
  const g = await graphGet(`/${accountId}/campaigns?fields=${CAMPAIGN_ENTITY_FIELDS}&limit=100`)
  const rows = Array.isArray((g as { data?: unknown })?.data) ? ((g as { data: unknown[] }).data as Record<string, unknown>[]) : []
  const out: Record<string, CampaignEntity> = {}
  for (const r of rows) {
    const id = str(r.id)
    if (id) out[id] = parseCampaignEntity(r)
  }
  return out
}


const ACCOUNT_HEALTH_FIELDS = 'account_status,disable_reason,spend_cap,amount_spent,balance,funding_source,name'


export async function lerSaudeConta(
  accountId: string,
  deps: { graphGet?: typeof metaGraphGet } = {},
): Promise<ReturnType<typeof parseAccountHealth>> {
  const graphGet = deps.graphGet ?? metaGraphGet
  const node = await graphGet(`/${accountId}?fields=${ACCOUNT_HEALTH_FIELDS}`)
  const row = node && typeof node === 'object' && !Array.isArray(node) ? (node as Record<string, unknown>) : {}
  return parseAccountHealth(row)
}


const AD_REVIEW_STATUSES = ['DISAPPROVED', 'WITH_ISSUES', 'PENDING_REVIEW'] as const


export async function lerAdsReprovados(
  accountId: string,
  deps: { graphGet?: typeof metaGraphGet } = {},
): Promise<ReturnType<typeof parseAdReview>[]> {
  const graphGet = deps.graphGet ?? metaGraphGet
  const filteringEncoded = encodeURIComponent(
    JSON.stringify([{ field: 'effective_status', operator: 'IN', value: [...AD_REVIEW_STATUSES] }]),
  )
  const g = await graphGet(
    `/${accountId}/ads?fields=id,name,effective_status,configured_status,ad_review_feedback,campaign_id,adset_id&filtering=${filteringEncoded}&limit=200`,
  )
  const rows = Array.isArray((g as { data?: unknown })?.data) ? ((g as { data: unknown[] }).data as Record<string, unknown>[]) : []
  return rows.map((r) => parseAdReview(r))
}


export async function lerBreakdown(
  accountId: string, breakdowns: string[], periodo: Periodo | undefined,
  run: typeof runActionDefault, agent: string,
  conversaoTypes: readonly string[] = PURCHASE_TYPES,
): Promise<SegmentoInput[]> {
  try {
    const base = buildInsightsArgs(accountId, 'account', periodo)
    const res = (await run({ slug: INSIGHTS_SLUG, args: { ...base, breakdowns }, userId: composioUserId(), agent })) as Envelope
    if (!res.successful || res.error) return []
    const rows = Array.isArray(res.data?.data) ? (res.data!.data as Record<string, unknown>[]) : []
    return rows.map((r) => ({
      segmento: breakdowns.map((k) => str(r[k]) ?? '?').join(' · '),
      m: normalize(r, conversaoTypes),
    }))
  } catch (e) {
    console.warn('[lerBreakdown] falhou (fail-open):', e); return []
  }
}


export async function lerHoras(
  accountId: string, run: typeof runActionDefault, agent: string,
): Promise<LinhaHora[]> {
  try {
    const res = (await run({
      slug: INSIGHTS_SLUG,
      args: {
        object_id: accountId, level: 'account', date_preset: 'today',
        breakdowns: ['hourly_stats_aggregated_by_advertiser_time_zone'],
        fields: 'spend,impressions', limit: 50,
      },
      userId: composioUserId(), agent,
    })) as Envelope
    if (!res.successful || res.error) return []
    return parseHoras(res.data?.data)
  } catch (e) {
    console.warn('[lerHoras] falhou (fail-open):', e); return []
  }
}


function lineFor(name: string | null, id: string, m: MetricShape): string {
  const parts: string[] = []
  if (m.spend !== undefined) parts.push(`gasto ${fmtBRL(m.spend)}`)
  if (m.roas !== undefined) parts.push(`ROAS ${m.roas.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x`)
  if (m.cpa !== undefined) parts.push(`CPA ${fmtBRL(m.cpa)}`)
  if (m.conversions !== undefined) parts.push(`${m.conversions} conv.`)
  if (m.ctr !== undefined) parts.push(`CTR ${fmtPct(m.ctr)}`)
  const head = name ? `${name} [${id}]: ` : `[${id}]: `
  return head + (parts.length ? parts.join(' · ') : 'sem métricas no período')
}


async function montarDiagnostico(
  normals: { id: string; m: MetricShape }[],
  ctx: BuscarMetricasCtx,
  nivel: Nivel,
  listLatest: typeof listLatestSnapshotsDefault,
): Promise<string> {
  const sinais: string[] = []

  
  const comFunil = normals.find((n) => n.m.funnel && Object.keys(n.m.funnel).length >= 2)
  if (comFunil?.m.funnel) {
    const vaz = vazamentoCurto(comFunil.m.funnel)
    if (vaz) sinais.push(`maior vazamento: ${vaz}`)
  }

  
  
  const ref = normals[0]
  if (ref && ctx.operatorId) {
    try {
      const hist = await listLatest(ctx.operatorId, nivel)
      const serie = hist
        .filter((s) => s.entity_id === ref.id)
        .map((s) => s.metrics as MetricShape)
        .reverse()
      if (serie.length >= 2 && detectarFadiga(serie)) {
        sinais.push('sinal de fadiga (freq↑ & CTR↓)')
      }
    } catch (e) {
      console.warn('[buscarMetricas] diagnóstico de fadiga falhou (não-fatal):', e)
    }
  }

  return sinais.join('; ')
}

export type LerInsightsResult =
  | { ok: true; rows: { id: string; name: string | null; m: MetricShape; since?: string; until?: string; parentIds?: { campaignId?: string; adsetId?: string } }[]; accountId: string }
  | { ok: false; reason: 'not_configured' | 'expired' | 'empty' | 'error'; message: string }


export async function lerInsights(
  objectId: string, nivel: Nivel, periodo: Periodo | undefined,
  run: typeof runActionDefault, agent: string,
  conversaoTypes: readonly string[] = PURCHASE_TYPES,
): Promise<LerInsightsResult> {
  const args = buildInsightsArgs(objectId, nivel, periodo)
  const res = (await run({ slug: INSIGHTS_SLUG, args, userId: composioUserId(), agent })) as Envelope
  if (!res.successful || res.error) {
    if (res.error === 'not_configured') return { ok: false, reason: 'not_configured', message: 'Ações externas ainda não estão configuradas — conecte a chave Composio e o Meta Ads em /config.' }
    const msg = str(res.data?.message) ?? 'erro ao acessar o Meta'
    return { ok: false, reason: 'error', message: `Não consegui ler o Meta Ads agora: ${msg}. Se a sessão expirou, reconecte o Meta em /config.` }
  }
  const rows = Array.isArray(res.data?.data) ? (res.data!.data as Record<string, unknown>[]) : []
  
  
  if (rows.length === 0) return { ok: false, reason: 'empty', message: `Leitura OK (a conta ESTÁ conectada), mas SEM dados de ${NIVEL_LABEL[nivel]} no período (${periodoLabel(periodo)}): 0 linhas, gasto zero. Isso NÃO é erro técnico nem de conexão — a conta está sem campanhas ativas/gasto nesse intervalo (conta nova, pausada, ou período curto). Tente um período MAIOR (chame de novo com periodo {preset:'last_30d'} ou {preset:'maximum'}) antes de concluir; se seguir zerado, diga ao operador que a conta não teve atividade nesse intervalo. NUNCA peça pra recarregar a página.` }
  const accountId = str(rows[0]?.account_id) ?? objectId
  const normals = rows.map((row) => {
    const { id, name } = entityOf(row, nivel, objectId)
    return {
      id, name, m: normalize(row, conversaoTypes),
      since: str(row.date_start) ?? periodo?.range?.since,
      until: str(row.date_stop) ?? periodo?.range?.until,
      parentIds: { campaignId: str(row.campaign_id), adsetId: str(row.adset_id) },
    }
  })
  return { ok: true, rows: normals, accountId }
}

export async function buscarMetricas(
  input: BuscarMetricasInput,
  ctx: BuscarMetricasCtx,
  deps: BuscarMetricasDeps = {},
): Promise<string> {
  const run = deps.runAction ?? runActionDefault
  const createSnapshot = deps.createSnapshot ?? createSnapshotDefault
  const listLatest = deps.listLatestSnapshots ?? listLatestSnapshotsDefault
  const nivel: Nivel = input.nivel ?? 'account'
  const agent = ctx.actingAgentId ?? 'jarvis'

  if (!ctx.operatorId) {
    return 'Não consegui identificar o operador para salvar as métricas — recarregue a página e tente de novo.'
  }

  
  
  let objectId = input.entidade
  if (!objectId) {
    let found: string | null
    if (deps.getAccountId) {
      found = await deps.getAccountId(ctx, run)
    } else {
      const accounts = await discoverAllAccounts(ctx, run)
      const getPreferred = deps.getPreferredAccountId ?? (() => getSetting(ACCOUNT_SETTING_KEY))
      const preferred = await getPreferred().catch(() => null)
      found = resolveAccountId(accounts, preferred)
    }
    if (!found) {
      return 'Não encontrei uma conta de anúncios conectada. Conecte o Meta Ads em /config (toolkit Meta Ads) e reconecte se a sessão tiver expirado.'
    }
    objectId = found
  }

  
  
  const result = await lerInsights(objectId, nivel, input.periodo, run, agent)
  if (!result.ok) {
    return result.message
  }
  const normals = result.rows

  
  
  
  await Promise.allSettled(normals.map(async ({ id, name, m, since, until }) => {
    if (!since || !until) return
    try {
      await createSnapshot({
        operator_id: ctx.operatorId!,
        source: 'metaads',
        level: nivel,
        entity_id: id,
        entity_name: name,
        period_start: since,
        period_end: until,
        metrics: m as Record<string, unknown>,
      })
    } catch (e) {
      console.warn('[buscarMetricas] createSnapshot falhou (não-fatal):', e)
    }
  }))
  
  const lines = normals.map(({ name, id, m }) => lineFor(name, id, m))

  
  const diag = await montarDiagnostico(normals, ctx, nivel, listLatest)

  
  
  const escopo = `Puxei o Meta (${NIVEL_LABEL[nivel]}, ${periodoLabel(input.periodo)})`
  const escopoHint = `\nConta: ${result.accountId} — use esse accountId + o id da entidade (entre colchetes) no escopo das recomendações.`
  const base =
    normals.length === 1
      ? `${escopo}: ${lines[0]}. Snapshot salvo — montei a leitura, posso desenhar o painel.${escopoHint}`
      : `${escopo} — ${normals.length} entidades:\n${lines.map((l) => `• ${l}`).join('\n')}\nSnapshots salvos — posso montar o painel.${escopoHint}`
  return diag ? `${base}\nDiagnóstico: ${diag}.` : base
}
