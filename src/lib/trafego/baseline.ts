
import type { MetricShape } from '@/lib/trafego/types'

export const BASELINE_MIN_DIAS = 7
export const METRICAS_BASELINE = ['roas', 'cpa', 'ctr', 'cpm', 'frequency'] as const
export type MetricaBaseline = typeof METRICAS_BASELINE[number]

export type DiaSerie = { date: string; m: MetricShape }
export interface FaixaNormal { metric: string; mediana: number; p25: number; p75: number; n: number }
export interface VsNormal { posicao: 'acima' | 'dentro' | 'abaixo'; distPct: number }


function percentil(ordenado: number[], p: number): number {
  if (ordenado.length === 1) return ordenado[0]
  const idx = (ordenado.length - 1) * p
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  return lo === hi ? ordenado[lo] : ordenado[lo] + (ordenado[hi] - ordenado[lo]) * (idx - lo)
}

function valores(serie: DiaSerie[], metric: MetricaBaseline): number[] {
  return serie
    .map((d) => d.m[metric])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b)
}


export function faixaNormal(serie: DiaSerie[], metric: MetricaBaseline): FaixaNormal | null {
  const vals = valores(serie, metric)
  if (vals.length === 0) return null
  return { metric, mediana: percentil(vals, 0.5), p25: percentil(vals, 0.25), p75: percentil(vals, 0.75), n: vals.length }
}


export function avaliarVsNormal(valorAtual: number, faixa: FaixaNormal): VsNormal {
  const posicao = valorAtual > faixa.p75 ? 'acima' : valorAtual < faixa.p25 ? 'abaixo' : 'dentro'
  const distPct = faixa.mediana !== 0 ? (valorAtual - faixa.mediana) / Math.abs(faixa.mediana) : 0
  return { posicao, distPct }
}

export interface Tendencia { metric: string; direcao: 'subindo' | 'caindo' | 'estável'; diasSeguidos: number; variacaoPct: number }
export interface AccountBaseline {
  faixas: Record<string, FaixaNormal>
  tendencias: Record<string, Tendencia>
  diaSemana?: Record<string, Record<number, number>>
  dias: number
  suficiente: boolean
}


const ESTAVEL_PCT = 0.02


export function tendencia(serie: DiaSerie[], metric: MetricaBaseline): Tendencia | null {
  const pts = serie.map((d) => d.m[metric]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (pts.length < 2) return null
  const first = pts[0], last = pts[pts.length - 1]
  const variacaoPct = first !== 0 ? (last - first) / Math.abs(first) : 0
  const passo = Math.sign(last - pts[pts.length - 2])
  let diasSeguidos = 0
  let inicioCorrida = last 
  if (passo !== 0) for (let i = pts.length - 1; i > 0; i--) {
    if (Math.sign(pts[i] - pts[i - 1]) === passo) { diasSeguidos++; inicioCorrida = pts[i - 1] } else break
  }
  const varCorrida = inicioCorrida !== 0 ? (last - inicioCorrida) / Math.abs(inicioCorrida) : 0
  const direcao: Tendencia['direcao'] =
    passo === 0 || Math.abs(varCorrida) < ESTAVEL_PCT ? 'estável' : passo > 0 ? 'subindo' : 'caindo'
  return { metric, direcao, diasSeguidos, variacaoPct }
}


function diaSemanaDe(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getUTCDay()
}


function mediaPorDiaSemana(serie: DiaSerie[], metric: MetricaBaseline): Record<number, number> {
  const soma: Record<number, { s: number; n: number }> = {}
  for (const d of serie) {
    const v = d.m[metric]
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    const dow = diaSemanaDe(d.date)
    ;(soma[dow] ??= { s: 0, n: 0 }).s += v; soma[dow].n += 1
  }
  const out: Record<number, number> = {}
  for (const [k, { s, n }] of Object.entries(soma)) out[Number(k)] = s / n
  return out
}


export function computarBaseline(serie: DiaSerie[]): AccountBaseline {
  const faixas: Record<string, FaixaNormal> = {}
  const tendencias: Record<string, Tendencia> = {}
  const diaSemana: Record<string, Record<number, number>> = {}
  for (const metric of METRICAS_BASELINE) {
    const f = faixaNormal(serie, metric); if (f) faixas[metric] = f
    const t = tendencia(serie, metric); if (t) tendencias[metric] = t
    const dw = mediaPorDiaSemana(serie, metric); if (Object.keys(dw).length) diaSemana[metric] = dw
  }
  const dias = serie.length
  return { faixas, tendencias, diaSemana: Object.keys(diaSemana).length ? diaSemana : undefined, dias, suficiente: dias >= BASELINE_MIN_DIAS }
}
