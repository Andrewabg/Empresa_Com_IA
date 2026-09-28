



import type { MetricShape } from '@/lib/trafego/types'
import type { Periodo } from '@/server/tools/trafego/buscarMetricas'
import type { KpiTileConfig } from '@/components/trafego/KpiTile'
import type { SeriePonto } from '@/components/trafego/PainelCanvas'
import type { FunnelStepConfig } from '@/components/trafego/FunnelBlock'
import type { CampaignRow } from '@/components/trafego/CampaignTable'
import type { CreativeRow } from '@/components/trafego/CreativesBlock'
import { funnelLabel } from '@/lib/trafego/funnelLabels'
import { fadigaCriativoSemSerie } from '@/lib/trafego/diagnostico'
import { diagnosticar, sinalPrincipal } from '@/lib/trafego/sinais'
import { vereditoDe } from '@/lib/trafego/veredito'
import type { DiaSerie, AccountBaseline } from '@/lib/trafego/baseline'
import type { FrameConta } from '@/lib/trafego/perfilConta'
import type { BenchmarkNicho } from '@/lib/trafego/benchmarks'
import { diagnosticarCriativo, type DiagCriativo } from '@/lib/trafego/criativo'


const PRESET_DAYS: Record<string, number> = {
  today: 1, yesterday: 1, last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90,
}
const DAY = 86400000
function shiftISO(iso: string, deltaDays: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}
function daysInclusive(since: string, until: string): number {
  const a = Date.parse(since + 'T00:00:00Z'); const b = Date.parse(until + 'T00:00:00Z')
  return Math.round((b - a) / DAY) + 1
}


export function janelaAnterior(periodo: Periodo | undefined, hojeISO: string): Periodo | undefined {
  if (periodo?.range) {
    const dur = daysInclusive(periodo.range.since, periodo.range.until)
    return { range: { since: shiftISO(periodo.range.since, -dur), until: shiftISO(periodo.range.since, -1) } }
  }
  const preset = periodo?.preset ?? 'last_7d'
  const n = PRESET_DAYS[preset]
  if (!n) return undefined
  return { range: { since: shiftISO(hojeISO, -2 * n), until: shiftISO(hojeISO, -(n + 1)) } }
}


export function duracaoPeriodoDias(periodo?: Periodo): number {
  if (periodo?.range) return daysInclusive(periodo.range.since, periodo.range.until)
  const preset = periodo?.preset ?? 'last_7d'
  return PRESET_DAYS[preset] ?? 7
}


interface KpiSpec { label: string; metric: KpiTileConfig['metric']; fmt: KpiTileConfig['fmt']; inverseGood?: boolean }
const KPI_SPECS: KpiSpec[] = [
  { label: 'Gasto', metric: 'spend', fmt: 'brl' },
  { label: 'ROAS', metric: 'roas', fmt: 'num' },
  { label: 'CAC / CPA', metric: 'cpa', fmt: 'brl', inverseGood: true },
  { label: 'Conversões', metric: 'conversions', fmt: 'num' },
  { label: 'Receita', metric: 'conversion_value', fmt: 'brl' },
  { label: 'CTR', metric: 'ctr', fmt: 'pct' },
  { label: 'CPM', metric: 'cpm', fmt: 'brl', inverseGood: true },
  { label: 'Frequência', metric: 'frequency', fmt: 'num', inverseGood: true },
]


function delta(cur?: number, prev?: number): number | undefined {
  if (cur === undefined || prev === undefined || prev <= 0) return undefined
  return (cur - prev) / prev
}


export function buildKpiTiles(current: MetricShape, previous?: MetricShape, frame?: FrameConta): KpiTileConfig[] {
  const modoCpl = frame?.metricaPrimaria === 'cpa'
  const tiles: KpiTileConfig[] = []
  for (const s of KPI_SPECS) {
    const value = current[s.metric]
    if (value === undefined) continue
    const label = modoCpl && s.metric === 'cpa' ? 'CPL' : s.label
    const d = previous ? delta(value, previous[s.metric]) : undefined
    tiles.push({ label, metric: s.metric, fmt: s.fmt, value, ...(s.inverseGood ? { inverseGood: true } : {}), ...(d !== undefined ? { delta: d } : {}) })
  }
  return tiles
}


export function buildTimeseries(dias: { date: string; m: MetricShape }[]): SeriePonto[] {
  const pts = dias
    .filter((d) => d.m.spend !== undefined)
    .map((d) => ({ date: d.date, value: d.m.spend as number }))
    .sort((a, b) => a.date.localeCompare(b.date))
  return pts.length >= 2 ? pts : []
}


export function buildFunnelSteps(account: MetricShape): FunnelStepConfig[] {
  const funnel = account.funnel
  if (!funnel) return []
  const steps = Object.entries(funnel).map(([key, count]) => ({ label: funnelLabel(key), count }))
  return steps.length >= 2 ? steps : []
}

export interface Entidade { id: string; name: string | null; m: MetricShape }


export function buildCampaignRows(
  camps: Entidade[],
  seriePorId?: Record<string, DiaSerie[]>,
  baseline?: AccountBaseline | null,
  hojeISO?: string,
  frame?: FrameConta,
  benchmark?: BenchmarkNicho | null,
): CampaignRow[] {
  return [...camps]
    .sort((a, b) => (b.m.spend ?? 0) - (a.m.spend ?? 0))
    .map((c) => {
      const row: CampaignRow = {
        id: c.id,
        name: c.name ?? '(sem nome)',
        ...(c.m.spend !== undefined ? { spend: c.m.spend } : {}),
        ...(c.m.roas !== undefined ? { roas: c.m.roas } : {}),
        ...(c.m.ctr !== undefined ? { ctr: c.m.ctr } : {}),
      }
      const serie = seriePorId?.[c.id]
      if (serie) {
        
        const fechados = hojeISO ? serie.filter((d) => d.date < hojeISO) : serie
        const spark = fechados.slice(-7).map((d) => d.m.roas).filter((v): v is number => v !== undefined)
        if (spark.length >= 2) {
          row.spark = spark
          const penult = spark[spark.length - 2]
          if (penult > 0) row.deltaOntem = (spark[spark.length - 1] - penult) / penult
        }
        const s = diagnosticar({ m: c.m, serie, baseline: baseline ?? null, frame })
        row.veredito = vereditoDe(c.m, baseline ?? null, { sinais: s, frame, benchmarkKpi: benchmark?.kpi })
        const sp = sinalPrincipal(s)
        if (sp) row.sinalPrincipal = { texto: sp.texto, tipo: sp.tipo, severidade: sp.severidade }
      }
      return row
    })
}

const CREATIVE_CAP = 6

const CREATIVE_EDGE = 3


function toCreativeRow(a: Entidade, diag?: DiagCriativo): CreativeRow {
  const v = a.m.video
  return {
    name: a.name ?? '(sem nome)',
    ...(a.m.spend !== undefined ? { spend: a.m.spend } : {}),
    ...(a.m.cpa !== undefined ? { cpa: a.m.cpa } : {}),
    ...(a.m.ctr !== undefined ? { ctr: a.m.ctr } : {}),
    ...(a.m.frequency !== undefined ? { frequency: a.m.frequency } : {}),
    ...(v?.hook_rate !== undefined ? { hookRate: v.hook_rate } : {}),
    ...(v?.hold_rate !== undefined ? { holdRate: v.hold_rate } : {}),
    ...(diag ? { causa: diag.causa, nota: diag.diagnostico } : {}),
  }
}


export function buildCreativeRows(ads: Entidade[], baseline?: AccountBaseline | null, cpaAlvo?: number, benchmark?: BenchmarkNicho | null): CreativeRow[] {
  const ordenados = [...ads].sort((a, b) => (b.m.roas ?? -Infinity) - (a.m.roas ?? -Infinity))
  const escolhidos =
    ordenados.length <= CREATIVE_CAP
      ? ordenados
      : [...ordenados.slice(0, CREATIVE_EDGE), ...ordenados.slice(-CREATIVE_EDGE)]
  
  
  
  return escolhidos.map((a) =>
    toCreativeRow(
      a,
      baseline || benchmark
        ? diagnosticarCriativo({ id: a.id, nome: a.name, m: a.m, baseline, cpaAlvo, ...(benchmark ? { benchmark } : {}) })
        : undefined,
    ),
  )
}


export interface Signals {
  melhorCampanha?: { id: string; name: string; roas: number }
  piorCampanha?: { id: string; name: string; roas: number; spend: number }
  maiorDesperdicio?: { id: string; name: string; spend: number; roas: number }
  criativoFadiga?: { id: string; name: string; frequency: number; ctr: number }
}


const GASTO_RELEVANTE = 1

export function extractSignals(account: MetricShape, camps: Entidade[], ads: Entidade[]): Signals {
  const out: Signals = {}

  const comRoas = camps.filter((c) => c.m.roas !== undefined && (c.m.spend ?? 0) >= GASTO_RELEVANTE)
  if (comRoas.length) {
    const melhor = comRoas.reduce((a, b) => ((b.m.roas! > a.m.roas!) ? b : a))
    const pior = comRoas.reduce((a, b) => ((b.m.roas! < a.m.roas!) ? b : a))
    out.melhorCampanha = { id: melhor.id, name: melhor.name ?? '(sem nome)', roas: melhor.m.roas! }
    out.piorCampanha = { id: pior.id, name: pior.name ?? '(sem nome)', roas: pior.m.roas!, spend: pior.m.spend ?? 0 }
    const desperdicio = comRoas.filter((c) => c.m.roas! < 1).sort((a, b) => (b.m.spend ?? 0) - (a.m.spend ?? 0))[0]
    if (desperdicio) out.maiorDesperdicio = { id: desperdicio.id, name: desperdicio.name ?? '(sem nome)', spend: desperdicio.m.spend ?? 0, roas: desperdicio.m.roas! }
  }

  const cansado = ads.find((a) => fadigaCriativoSemSerie(a.m.frequency, a.m.ctr))
  if (cansado) out.criativoFadiga = { id: cansado.id, name: cansado.name ?? '(sem nome)', frequency: cansado.m.frequency!, ctr: cansado.m.ctr! }

  return out
}
