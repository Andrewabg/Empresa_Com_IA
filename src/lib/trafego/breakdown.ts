

import type { MetricShape } from '@/lib/trafego/types'
import { fmtBRL } from '@/lib/trafego/format'


const roas2 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export interface SegmentoInput { segmento: string; m: MetricShape }

export interface Segmento { segmento: string; spend: number; valor: number }
export interface BreakdownRank { piores: Segmento[]; melhores: Segmento[]; modo: ModoRank }


export type ModoRank = 'roas' | 'cpa'


const GASTO_MIN = 1

const TOP = 3


export function rankearSegmentos(rows: SegmentoInput[], modo: ModoRank = 'roas'): BreakdownRank {
  const relevantes: Segmento[] = rows
    .filter((r) => r.m[modo] !== undefined && (r.m.spend ?? 0) >= GASTO_MIN)
    .map((r) => ({ segmento: r.segmento, spend: r.m.spend as number, valor: r.m[modo] as number }))

  
  
  const piores = [...relevantes].sort((a, b) =>
    (modo === 'roas' ? a.valor - b.valor : b.valor - a.valor) || b.spend - a.spend,
  ).slice(0, TOP)
  const melhores = [...relevantes].sort((a, b) =>
    (modo === 'roas' ? b.valor - a.valor : a.valor - b.valor) || b.spend - a.spend,
  ).slice(0, TOP)

  return { piores, melhores, modo }
}


export function resumoBreakdown(rank: BreakdownRank, dimensao: string): string {
  const modo = rank.modo
  const pior = rank.piores[0]
  if (!pior) return ''
  const fmt = (v: number) => (modo === 'roas' ? `ROAS ${roas2(v)}x` : `CPL ${fmtBRL(v)}`)
  const melhor = rank.melhores[0]
  const partes = [`${dimensao} — pior: ${pior.segmento} (${fmt(pior.valor)}, gasto ${fmtBRL(pior.spend)})`]
  if (melhor && melhor.segmento !== pior.segmento) partes.push(`Melhor: ${melhor.segmento} (${fmt(melhor.valor)})`)
  return partes.join('. ') + '.'
}
