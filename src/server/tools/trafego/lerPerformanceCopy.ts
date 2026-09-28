


import { runAction as runActionDefault } from '../../actions/actions'
import { lerInsights as lerInsightsImpl, discoverAccountId as discoverAccountIdImpl, type LerInsightsResult } from './buscarMetricas'
import { lerCopyDoCriativo as lerCopyImpl } from './lerCopyDoCriativo'

export interface AnuncioPerf { id: string; nome: string | null; roas?: number; ctr?: number; spend?: number; copy?: string }
export interface PerformanceCopy { vencedores: AnuncioPerf[]; cansando: AnuncioPerf[] }
export interface LerPerformanceCopyCtx { operatorId: string; accountId?: string; actingAgentId?: string }
export interface LerPerformanceCopyDeps {
  run?: typeof runActionDefault
  lerInsights?: (objectId: string, nivel: 'ad', periodo: { preset: string }) => Promise<LerInsightsResult>
  lerCopy?: (ctx: { adId: string; actingAgentId?: string }) => Promise<{ message?: string; headline?: string; description?: string } | null>
  discoverAccountId?: typeof discoverAccountIdImpl
  topN?: number
  minSpend?: number
}

const DEFAULT_TOP_N = 5
const DEFAULT_MIN_SPEND = 20

function copyToStr(c: { message?: string; headline?: string; description?: string } | null): string | undefined {
  if (!c) return undefined
  return [c.headline, c.message, c.description].filter(Boolean).join(' | ') || undefined
}

export async function lerPerformanceCopy(
  ctx: LerPerformanceCopyCtx, deps: LerPerformanceCopyDeps = {},
): Promise<PerformanceCopy> {
  const run = deps.run ?? runActionDefault
  const agent = ctx.actingAgentId ?? 'copywriter'
  const lerInsights = deps.lerInsights ?? ((oid: string, niv: 'ad', per: { preset: string }) => lerInsightsImpl(oid, niv, per, run, agent))
  const lerCopy = deps.lerCopy ?? ((c) => lerCopyImpl(c))
  const discover = deps.discoverAccountId ?? discoverAccountIdImpl
  const topN = deps.topN ?? DEFAULT_TOP_N
  const minSpend = deps.minSpend ?? DEFAULT_MIN_SPEND
  const vazio: PerformanceCopy = { vencedores: [], cansando: [] }
  try {
    const accountId = ctx.accountId ?? (await discover({ operatorId: ctx.operatorId, actingAgentId: agent }, run))
    if (!accountId) return vazio
    const res = await lerInsights(accountId, 'ad', { preset: 'last_30d' })
    if (!res.ok) return vazio
    const comVolume = res.rows.filter((r) => (r.m.spend ?? 0) >= minSpend && r.m.roas !== undefined)
    if (comVolume.length === 0) return vazio
    const ordenados = [...comVolume].sort((a, b) => (b.m.roas ?? 0) - (a.m.roas ?? 0))
    const topRows = ordenados.slice(0, topN)
    const bottomRows = ordenados.slice(-topN).reverse().filter((r) => !topRows.includes(r))
    const anexar = async (r: (typeof ordenados)[number]): Promise<AnuncioPerf> => {
      let copy: string | undefined
      try { copy = copyToStr(await lerCopy({ adId: r.id, actingAgentId: agent })) } catch { copy = undefined }
      return { id: r.id, nome: r.name, roas: r.m.roas, ctr: r.m.ctr, spend: r.m.spend, copy }
    }
    const [vencedores, cansando] = await Promise.all([
      Promise.all(topRows.map(anexar)),
      Promise.all(bottomRows.map(anexar)),
    ])
    return { vencedores, cansando }
  } catch (e) {
    console.warn('[lerPerformanceCopy] falhou (fail-open):', e instanceof Error ? e.message : e)
    return vazio
  }
}
