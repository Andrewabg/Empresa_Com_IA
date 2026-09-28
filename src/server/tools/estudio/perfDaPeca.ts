




import { runAction as runActionDefault } from '../../actions/actions'
import { lerInsights as lerInsightsImpl, discoverAccountId as discoverAccountIdImpl, type LerInsightsResult } from '../trafego/buscarMetricas'
import { listDailySnapshots as listDailyImpl } from '@/data/trafego'
import { getLatestAccountMemory as getLatestAccountMemoryImpl } from '@/data/accountMemory'
import { computarBaseline, type AccountBaseline, type DiaSerie } from '@/lib/trafego/baseline'
import { diagnosticarCriativo } from '@/lib/trafego/criativo'
import { BACKFILL_TARGET } from '@/lib/trafego/historico'
import { vereditoDaPeca, type AdPerf } from '@/lib/estudio/adPerf'
import type { MetricShape } from '@/lib/trafego/types'

function shiftISO(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0, 10)
}


async function baselineDaConta(
  operatorId: string, listDaily: typeof listDailyImpl, now: () => string,
): Promise<AccountBaseline | null> {
  try {
    const hoje = now().slice(0, 10)
    const serie: DiaSerie[] = (await listDaily(operatorId, 'account', shiftISO(hoje, -BACKFILL_TARGET), hoje)).map((s) => ({ date: s.period_start, m: s.metrics as MetricShape }))
    return computarBaseline(serie)
  } catch { return null }
}


async function vereditoViaBaseline(
  operatorId: string, roas: number | undefined,
  listDaily: typeof listDailyImpl, now: () => string,
): Promise<AdPerf['veredito']> {
  const b = await baselineDaConta(operatorId, listDaily, now)
  return b ? vereditoDaPeca(roas, b) : undefined
}

export interface LerPerfDaPecaCtx { operatorId: string; adId: string; actingAgentId?: string }
export interface LerPerfDaPecaDeps {
  run?: typeof runActionDefault
  lerInsights?: (objectId: string, nivel: 'ad', periodo: { preset: string }) => Promise<LerInsightsResult>
  listDailySnapshots?: typeof listDailyImpl
  now?: () => string
}

export async function lerPerfDaPeca(ctx: LerPerfDaPecaCtx, deps: LerPerfDaPecaDeps = {}): Promise<AdPerf | null> {
  const run = deps.run ?? runActionDefault
  const agent = ctx.actingAgentId ?? 'copywriter'
  const lerInsights = deps.lerInsights ?? ((oid: string, niv: 'ad', per: { preset: string }) => lerInsightsImpl(oid, niv, per, run, agent))
  const listDaily = deps.listDailySnapshots ?? listDailyImpl
  const now = deps.now ?? (() => new Date().toISOString())
  try {
    const res = await lerInsights(ctx.adId, 'ad', { preset: 'last_30d' })
    if (!res.ok || res.rows.length === 0) return null
    const row = res.rows[0]
    const m = row.m as MetricShape
    const baseline = await baselineDaConta(ctx.operatorId, listDaily, now)
    const veredito = baseline ? vereditoDaPeca(m.roas, baseline) : undefined
    
    
    const diag = diagnosticarCriativo({ id: ctx.adId, nome: row.name ?? null, m, baseline })
    return {
      adId: ctx.adId, nome: row.name ?? undefined, roas: m.roas, ctr: m.ctr, spend: m.spend, veredito,
      ...(diag.hookRate !== undefined ? { hookRate: diag.hookRate } : {}),
      ...(diag.holdRate !== undefined ? { holdRate: diag.holdRate } : {}),
      causa: diag.causa,
      at: now(),
    }
  } catch (e) {
    console.warn('[lerPerfDaPeca] falhou (fail-open):', e instanceof Error ? e.message : e)
    return null
  }
}


export interface MetricasAd { roas?: number; ctr?: number; spend?: number; nome?: string | null }
export interface MontarPerfDeps { listDailySnapshots?: typeof listDailyImpl; now?: () => string }
export async function montarPerfDeMetricas(
  ctx: { operatorId: string; adId: string }, metricas: MetricasAd, deps: MontarPerfDeps = {},
): Promise<AdPerf> {
  const listDaily = deps.listDailySnapshots ?? listDailyImpl
  const now = deps.now ?? (() => new Date().toISOString())
  const veredito = await vereditoViaBaseline(ctx.operatorId, metricas.roas, listDaily, now)
  return { adId: ctx.adId, nome: metricas.nome ?? undefined, roas: metricas.roas, ctr: metricas.ctr, spend: metricas.spend, veredito, at: now() }
}

export interface ListAdsDaContaCtx { operatorId: string; accountId?: string; actingAgentId?: string }
export interface ListAdsDaContaDeps {
  run?: typeof runActionDefault
  lerInsights?: (objectId: string, nivel: 'ad', periodo: { preset: string }) => Promise<LerInsightsResult>
  discoverAccountId?: typeof discoverAccountIdImpl
  getLatestAccountMemory?: typeof getLatestAccountMemoryImpl
}
export interface AdDaConta { id: string; nome: string | null; roas?: number; ctr?: number; spend?: number }

function ordenarAds(rows: { id: string; name: string | null; m: MetricShape }[]): AdDaConta[] {
  return rows
    .map((r) => ({ id: r.id, nome: r.name, roas: r.m.roas, ctr: r.m.ctr, spend: r.m.spend }))
    .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
}

export async function listAdsDaConta(ctx: ListAdsDaContaCtx, deps: ListAdsDaContaDeps = {}): Promise<AdDaConta[]> {
  const run = deps.run ?? runActionDefault
  const agent = ctx.actingAgentId ?? 'copywriter'
  const lerInsights = deps.lerInsights ?? ((oid: string, niv: 'ad', per: { preset: string }) => lerInsightsImpl(oid, niv, per, run, agent))
  const discover = deps.discoverAccountId ?? discoverAccountIdImpl
  const getLatestMem = deps.getLatestAccountMemory ?? getLatestAccountMemoryImpl
  const discoverConta = () => discover({ operatorId: ctx.operatorId, actingAgentId: agent }, run)
  try {
    
    let accountId = ctx.accountId
    let daMemoria = false
    if (!accountId) {
      try {
        const mem = await getLatestMem(ctx.operatorId)
        if (mem?.accountId) { accountId = mem.accountId; daMemoria = true }
      } catch {  }
    }
    if (!accountId) accountId = (await discoverConta()) ?? undefined
    if (!accountId) return []

    let res = await lerInsights(accountId, 'ad', { preset: 'last_30d' })
    
    
    if (!res.ok && daMemoria) {
      const fresco = await discoverConta()
      if (fresco && fresco !== accountId) res = await lerInsights(fresco, 'ad', { preset: 'last_30d' })
    }
    if (!res.ok) return []
    return ordenarAds(res.rows)
  } catch (e) {
    console.warn('[listAdsDaConta] falhou (fail-open):', e instanceof Error ? e.message : e)
    return []
  }
}
