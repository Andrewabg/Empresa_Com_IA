



import type { MetricShape } from '@/lib/trafego/types'
import { fmtBRL, fmtPct } from '@/lib/trafego/format'


export type BlocoFmt = 'brl' | 'pct' | 'num'


export type KpiMetric =
  | 'spend' | 'impressions' | 'reach' | 'frequency' | 'clicks'
  | 'ctr' | 'cpc' | 'cpm' | 'conversions' | 'conversion_value' | 'roas' | 'cpa'


export function fmtValor(value: number | undefined, fmt: BlocoFmt): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (fmt === 'brl') return fmtBRL(value)
  if (fmt === 'pct') return fmtPct(value)
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}


export function fmtRoas(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '×'
}


export function metricValue(metrics: MetricShape | undefined, metric: KpiMetric): number | undefined {
  return metrics?.[metric]
}
