
import { runAction as runActionDefault } from '../../actions/actions'
import { lerInsights as lerInsightsDefault, type Nivel } from './buscarMetricas'
import {
  listDailySnapshots as listDailyDefault,
  upsertDailySnapshot as upsertDailyDefault,
} from '@/data/trafego'
import { getSetting as getSettingDefault } from '@/data/settings'
import { diasFaltantes, janelaBackfill, BACKFILL_TARGET } from '@/lib/trafego/historico'
import { throttleAtivo, THROTTLE_SETTING_KEY } from '@/lib/trafego/graph/throttle'
import type { DiaSerie } from '@/lib/trafego/baseline'
import type { MetricShape } from '@/lib/trafego/types'
import type { Limiter } from '@/lib/concurrency'


export const CONC = 8

const DEFAULT_AGENT = 'gestor-trafego'

export interface SincronizarHistoricoCtx {
  operatorId: string
  actingAgentId?: string
  
  hojeISO: string
  
  objectId: string
  
  conversaoTypes?: readonly string[]
  
  agoraISO?: string
}

export interface SincronizarHistoricoDeps {
  lerInsights?: typeof lerInsightsDefault
  listDailySnapshots?: typeof listDailyDefault
  upsertDailySnapshot?: typeof upsertDailyDefault
  runAction?: typeof runActionDefault
  getSetting?: typeof getSettingDefault
  
  limiter?: Limiter
  
  aoPausar?: () => void
}


function shiftISO(iso: string, deltaDays: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}


async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++
      await worker(items[idx])
    }
  })
  await Promise.all(runners)
}

export async function sincronizarHistorico(
  level: Nivel,
  entityId: string | null,
  ctx: SincronizarHistoricoCtx,
  deps: SincronizarHistoricoDeps = {},
): Promise<DiaSerie[]> {
  const ler = deps.lerInsights ?? lerInsightsDefault
  const listDaily = deps.listDailySnapshots ?? listDailyDefault
  const upsertDaily = deps.upsertDailySnapshot ?? upsertDailyDefault
  const run = deps.runAction ?? runActionDefault
  const agent = ctx.actingAgentId ?? DEFAULT_AGENT

  
  const desde = shiftISO(ctx.hojeISO, -BACKFILL_TARGET)
  const gravados = await listDaily(ctx.operatorId, level, desde, ctx.hojeISO, entityId ?? undefined)

  
  
  const th = throttleAtivo(await (deps.getSetting ?? getSettingDefault)(THROTTLE_SETTING_KEY).catch(() => null), ctx.agoraISO ?? new Date().toISOString())
  if (th.ativo) {
    deps.aoPausar?.()
    const porDia = new Map<string, MetricShape>()
    for (const g of gravados) porDia.set(g.period_start, g.metrics as MetricShape)
    return [...porDia.entries()]
      .map(([date, m]) => ({ date, m }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  }

  
  const earliest = gravados[0]?.period_start ?? null
  const alvo = janelaBackfill(earliest, ctx.hojeISO)

  
  const diasGravados = [...new Set(gravados.map((g) => g.period_start))]
  const faltam = diasFaltantes(alvo.since, alvo.until, diasGravados, ctx.hojeISO)

  
  
  const novosPorDia = new Map<string, MetricShape>()
  const dispatch = async (dia: string): Promise<void> => {
    try {
      const res = await ler(ctx.objectId, level, { range: { since: dia, until: dia } }, run, agent, ctx.conversaoTypes)
      if (!res.ok) return
      for (const linha of res.rows) {
        await upsertDaily({
          operator_id: ctx.operatorId,
          source: 'metaads',
          level,
          entity_id: linha.id,
          entity_name: linha.name,
          period_start: dia,
          period_end: dia,
          metrics: linha.m as Record<string, unknown>,
        })
      }
      
      if (res.rows[0]) novosPorDia.set(dia, res.rows[0].m)
    } catch (e) {
      console.warn('[sincronizarHistorico] dia pulado (não-fatal):', dia, e)
    }
  }
  if (deps.limiter) {
    
    await Promise.all(faltam.map((dia) => deps.limiter!.run(() => dispatch(dia))))
  } else {
    
    await runPool(faltam, CONC, dispatch)
  }

  
  
  
  const porDia = new Map<string, MetricShape>()
  for (const g of gravados) porDia.set(g.period_start, g.metrics as MetricShape)
  for (const [dia, m] of novosPorDia) porDia.set(dia, m)

  return [...porDia.entries()]
    .map(([date, m]) => ({ date, m }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}
