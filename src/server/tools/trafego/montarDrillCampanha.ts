
import { runAction as runActionDefault } from '../../actions/actions'
import {
  lerInsights as lerInsightsDefault,
  discoverAccountId as discoverAccountIdDefault,
  type Periodo,
  type LerInsightsResult,
} from './buscarMetricas'
import {
  listDailySnapshots as listDailySnapshotsDefault,
  upsertBloco as upsertBlocoDefault,
  listBlocos as listBlocosDefault,
} from '@/data/trafego'
import { computarBaseline as computarBaselineDefault, type DiaSerie } from '@/lib/trafego/baseline'
import { BACKFILL_TARGET } from '@/lib/trafego/historico'
import { montarArvore, drilldownConfig, type EntidadeDrill } from '@/lib/trafego/drill'
import { toPainelBloco } from './blocoResult'
import type { MetricShape, PainelBlocoPatch } from '@/lib/trafego/types'

const DEFAULT_AGENT = 'gestor-trafego'

export interface MontarDrillInput {
  campaignId: string
  periodo?: Periodo
}

export interface MontarDrillCtx {
  operatorId: string
  actingAgentId?: string
  
  hojeISO: string
}

export interface MontarDrillDeps {
  runAction?: typeof runActionDefault
  lerInsights?: typeof lerInsightsDefault
  listDailySnapshots?: typeof listDailySnapshotsDefault
  upsertBloco?: typeof upsertBlocoDefault
  listBlocos?: typeof listBlocosDefault
  getAccountId?: (ctx: { operatorId?: string; actingAgentId?: string }, run: typeof runActionDefault) => Promise<string | null>
  computarBaseline?: typeof computarBaselineDefault
}

export type MontarDrillResult =
  | { ok: true; patch: PainelBlocoPatch }
  | { ok: false; reason: 'no_account' | 'no_data' | 'error'; message: string }


function shiftISO(iso: string, deltaDays: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}


function toDrill(rows: Extract<LerInsightsResult, { ok: true }>['rows']): EntidadeDrill[] {
  return rows.map((r) => ({ id: r.id, nome: r.name, m: r.m, parentIds: r.parentIds }))
}

export async function montarDrillCampanha(
  input: MontarDrillInput,
  ctx: MontarDrillCtx,
  deps: MontarDrillDeps = {},
): Promise<MontarDrillResult> {
  const run = deps.runAction ?? runActionDefault
  const ler = deps.lerInsights ?? lerInsightsDefault
  const listDaily = deps.listDailySnapshots ?? listDailySnapshotsDefault
  const upsertBloco = deps.upsertBloco ?? upsertBlocoDefault
  const listBlocos = deps.listBlocos ?? listBlocosDefault
  const getAccountId = deps.getAccountId ?? discoverAccountIdDefault
  const computarBaseline = deps.computarBaseline ?? computarBaselineDefault

  const operatorId = ctx.operatorId
  const agent = ctx.actingAgentId ?? DEFAULT_AGENT
  const campaignId = input.campaignId?.trim()
  if (!campaignId) return { ok: false, reason: 'error', message: 'campaignId ausente.' }

  
  const accountId = await getAccountId({ operatorId, actingAgentId: ctx.actingAgentId }, run)
  if (!accountId) return { ok: false, reason: 'no_account', message: 'Sem conta de anúncios conectada.' }

  
  
  
  let baseline: ReturnType<typeof computarBaseline> | null = null
  try {
    const desde = shiftISO(ctx.hojeISO, -BACKFILL_TARGET)
    const gravados = await listDaily(operatorId, 'account', desde, ctx.hojeISO)
    const serie: DiaSerie[] = gravados.map((g) => ({ date: g.period_start, m: g.metrics as MetricShape }))
    baseline = computarBaseline(serie)
  } catch (e) {
    console.warn('[montarDrillCampanha] baseline falhou (não-fatal):', e)
  }

  
  const [campR, adsetR, adR] = await Promise.all([
    ler(campaignId, 'campaign', input.periodo, run, agent),
    ler(campaignId, 'adset', input.periodo, run, agent),
    ler(campaignId, 'ad', input.periodo, run, agent),
  ])
  if (!campR.ok) {
    return { ok: false, reason: campR.reason === 'empty' ? 'no_data' : 'error', message: campR.message }
  }

  
  
  const arvore = montarArvore(
    toDrill(campR.rows),
    adsetR.ok ? toDrill(adsetR.rows) : [],
    adR.ok ? toDrill(adR.rows) : [],
    baseline,
  )
  const camp = arvore.find((c) => c.id === campaignId) ?? arvore[0]
  if (!camp) return { ok: false, reason: 'no_data', message: 'Sem dados da campanha no período.' }

  
  
  const existentes = await listBlocos(operatorId, agent)
  const jaAberto = existentes.find(
    (b) => b.type === 'drilldown' && (b.config as { campanha?: { id?: string } })?.campanha?.id === campaignId,
  )
  const position = jaAberto?.position ?? existentes.reduce((mx, b) => Math.max(mx, b.position), 0) + 1

  const row = await upsertBloco({
    ...(jaAberto ? { id: jaAberto.id } : {}),
    operator_id: operatorId,
    agent_id: agent,
    type: 'drilldown',
    config: drilldownConfig(camp, accountId),
    position,
  })
  return { ok: true, patch: { op: 'upsert', bloco: toPainelBloco(row) } }
}
