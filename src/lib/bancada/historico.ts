



import type { SnapshotRow } from '@/data/trafego'
import type { MetricShape } from '@/lib/trafego/types'
import type { AccountBaseline, DiaSerie } from '@/lib/trafego/baseline'
import { campoSeguro } from '@/lib/fontes/sanitizar'
import type { ColunaDaBancada, TabelaDaBancada } from './tipos'

const METRICAS = ['spend', 'impressions', 'reach', 'frequency', 'clicks', 'ctr', 'cpc', 'cpm', 'conversions', 'conversion_value', 'roas', 'cpa'] as const

export const COLUNAS_DO_HISTORICO: ColunaDaBancada[] = [
  { nome: 'entidade_id', tipo: 'texto' }, { nome: 'entidade_nome', tipo: 'texto' },
  { nome: 'nivel', tipo: 'texto' }, { nome: 'dia', tipo: 'texto' },
  ...METRICAS.map((m) => ({ nome: m, tipo: 'real' as const })),
]

function numero(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function texto(v: unknown): string {
  return campoSeguro(v === null || v === undefined ? null : String(v))
}

export function linhasDoHistorico(rows: SnapshotRow[]): TabelaDaBancada {
  const ordenado = [...rows].sort((a, b) => (a.period_start < b.period_start ? 1 : a.period_start > b.period_start ? -1 : 0))
  const linhas = ordenado.map((r) => {
    const m = (r.metrics ?? {}) as MetricShape
    return [texto(r.entity_id), texto(r.entity_name), r.level, r.period_start, ...METRICAS.map((k) => numero(m[k]))]
  })
  return { nome: 'historico', colunas: COLUNAS_DO_HISTORICO, linhas }
}

export function serieDaConta(rows: SnapshotRow[]): DiaSerie[] {
  return rows
    .filter((r) => r.level === 'account')
    .sort((a, b) => (a.period_start < b.period_start ? -1 : a.period_start > b.period_start ? 1 : 0))
    .map((r) => ({ date: r.period_start, m: (r.metrics ?? {}) as MetricShape }))
}

export function linhasDoNormal(baseline: AccountBaseline): TabelaDaBancada {
  const colunas: ColunaDaBancada[] = [
    { nome: 'metrica', tipo: 'texto' }, { nome: 'p25', tipo: 'real' }, { nome: 'mediana', tipo: 'real' }, { nome: 'p75', tipo: 'real' }, { nome: 'n', tipo: 'inteiro' },
  ]
  const linhas = Object.values(baseline.faixas).map((f) => [f.metric, f.p25, f.mediana, f.p75, f.n])
  return { nome: 'normal_da_conta', colunas, linhas }
}
