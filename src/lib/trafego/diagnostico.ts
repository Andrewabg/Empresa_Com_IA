



import type { MetricShape } from '@/lib/trafego/types'



export const FADIGA_MIN_PONTOS = 3

export const FADIGA_FREQ_ALTA = 0.15

export const FADIGA_CTR_QUEDA = 0.15


export function detectarFadiga(serie: MetricShape[]): boolean {
  if (serie.length < FADIGA_MIN_PONTOS) return false
  const first = serie[0]
  const last = serie[serie.length - 1]
  const f0 = first.frequency
  const f1 = last.frequency
  const c0 = first.ctr
  const c1 = last.ctr
  if (f0 === undefined || f1 === undefined || c0 === undefined || c1 === undefined) return false
  if (f0 <= 0 || c0 <= 0) return false
  const freqSubiu = (f1 - f0) / f0 >= FADIGA_FREQ_ALTA
  const ctrCaiu = (c0 - c1) / c0 >= FADIGA_CTR_QUEDA
  return freqSubiu && ctrCaiu
}


export const FREQ_FADIGA = 3

export const CTR_BAIXO = 0.01


export function fadigaCriativoSemSerie(frequency?: number, ctr?: number): boolean {
  if (frequency === undefined || ctr === undefined) return false
  return frequency >= FREQ_FADIGA && ctr <= CTR_BAIXO
}


export interface Dropoff {
  
  etapa: string
  
  queda: number
}


export function dropoffFunil(funnel: Record<string, number>): Dropoff | null {
  const etapas = Object.keys(funnel)
  if (etapas.length < 2) return null
  let melhor: Dropoff | null = null
  for (let i = 1; i < etapas.length; i++) {
    const anterior = funnel[etapas[i - 1]]
    const atual = funnel[etapas[i]]
    if (!(anterior > 0)) continue 
    const queda = (anterior - atual) / anterior
    if (queda <= 0) continue 
    if (melhor === null || queda > melhor.queda) {
      melhor = { etapa: etapas[i], queda }
    }
  }
  return melhor
}


export interface RecScore {
  impacto: number
  esforco: number
  
  peso?: number
}


export function ordenarRecomendacoes<T extends RecScore>(recs: T[]): T[] {
  return recs
    .map((r, i) => ({ r, i, score: r.impacto * (r.peso ?? 1) - r.esforco }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.r)
}
