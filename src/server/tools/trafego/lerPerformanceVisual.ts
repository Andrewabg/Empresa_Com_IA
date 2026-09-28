









import { runAction as runActionDefault } from '../../actions/actions'
import { lerInsights as lerInsightsImpl, discoverAccountId as discoverAccountIdImpl, type LerInsightsResult } from './buscarMetricas'
import { descreverCriativo as descreverImpl, type DescricaoCriativo } from './descreverCriativo'

export interface AnuncioVisual {
  id: string
  nome: string | null
  roas?: number
  ctr?: number
  spend?: number
  
  visual?: string
  tipoMidia?: 'imagem' | 'video'
}
export interface PerformanceVisual { vencedores: AnuncioVisual[]; cansando: AnuncioVisual[] }

export interface LerPerformanceVisualCtx { operatorId: string; accountId?: string; actingAgentId?: string }
export interface LerPerformanceVisualDeps {
  run?: typeof runActionDefault
  lerInsights?: (objectId: string, nivel: 'ad', periodo: { preset: string }) => Promise<LerInsightsResult>
  descrever?: (ctx: { adId: string; actingAgentId?: string }) => Promise<DescricaoCriativo | null>
  discoverAccountId?: typeof discoverAccountIdImpl
  topN?: number
  bottomN?: number
  minSpend?: number
}

const DEFAULT_TOP_N = 3
const DEFAULT_BOTTOM_N = 2
const DEFAULT_MIN_SPEND = 20

export async function lerPerformanceVisual(
  ctx: LerPerformanceVisualCtx, deps: LerPerformanceVisualDeps = {},
): Promise<PerformanceVisual> {
  const run = deps.run ?? runActionDefault
  const agent = ctx.actingAgentId ?? 'designer'
  const lerInsights = deps.lerInsights ?? ((oid: string, niv: 'ad', per: { preset: string }) => lerInsightsImpl(oid, niv, per, run, agent))
  const descrever = deps.descrever ?? ((c) => descreverImpl(c))
  const discover = deps.discoverAccountId ?? discoverAccountIdImpl
  const topN = deps.topN ?? DEFAULT_TOP_N
  const bottomN = deps.bottomN ?? DEFAULT_BOTTOM_N
  const minSpend = deps.minSpend ?? DEFAULT_MIN_SPEND
  const vazio: PerformanceVisual = { vencedores: [], cansando: [] }

  try {
    const accountId = ctx.accountId ?? (await discover({ operatorId: ctx.operatorId, actingAgentId: agent }, run))
    if (!accountId) return vazio
    const res = await lerInsights(accountId, 'ad', { preset: 'last_30d' })
    if (!res.ok) return vazio

    
    const comVolume = res.rows.filter((r) => (r.m.spend ?? 0) >= minSpend && r.m.roas !== undefined)
    if (comVolume.length === 0) return vazio

    const ordenados = [...comVolume].sort((a, b) => (b.m.roas ?? 0) - (a.m.roas ?? 0))
    const topRows = ordenados.slice(0, topN)
    
    
    const bottomRows = ordenados.slice(-bottomN).reverse().filter((r) => !topRows.includes(r))

    const anexar = async (r: (typeof ordenados)[number]): Promise<AnuncioVisual> => {
      let desc: DescricaoCriativo | null = null
      try { desc = await descrever({ adId: r.id, actingAgentId: agent }) } catch { desc = null }
      return {
        id: r.id, nome: r.name, roas: r.m.roas, ctr: r.m.ctr, spend: r.m.spend,
        ...(desc?.descricao ? { visual: desc.descricao, tipoMidia: desc.tipo } : {}),
      }
    }

    const [vencedores, cansando] = await Promise.all([
      Promise.all(topRows.map(anexar)),
      Promise.all(bottomRows.map(anexar)),
    ])
    return { vencedores, cansando }
  } catch (e) {
    console.warn('[lerPerformanceVisual] falhou (fail-open):', e instanceof Error ? e.message : e)
    return vazio
  }
}
