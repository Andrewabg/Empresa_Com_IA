

import type { SearchTermRow } from '@/lib/google-ads/types'


function normalizar(termo: string): string[] {
  return termo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') 
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}


export function tokenizar(termo: string, n: 1 | 2 | 3): string[] {
  const palavras = normalizar(termo)
  if (palavras.length < n) return []
  const out: string[] = []
  const vistos = new Set<string>()
  for (let i = 0; i + n <= palavras.length; i++) {
    const frag = palavras.slice(i, i + n).join(' ')
    if (!vistos.has(frag)) { vistos.add(frag); out.push(frag) }
  }
  return out
}

export interface NgramAgg {
  fragmento: string
  n: 1 | 2 | 3
  
  instancias: number
  clicks: number
  cost: number
  conversions: number
  conversionValue: number
  impressions: number
  
  ctr: number            
  cpc: number            
  cvr: number            
  cpa: number | null     
  roas: number | null    
}

interface Acc {
  clicks: number
  cost: number
  conversions: number
  conversionValue: number
  impressions: number
  instancias: number
}


export function minerarNgrams(rows: SearchTermRow[], opts?: { ns?: (1 | 2 | 3)[] }): NgramAgg[] {
  const ns = opts?.ns ?? [1, 2, 3]
  const mapa = new Map<string, Acc & { n: 1 | 2 | 3 }>()
  for (const row of rows) {
    for (const n of ns) {
      for (const frag of tokenizar(row.termo, n)) {
        const chave = `${n}:${frag}`
        const cur = mapa.get(chave) ?? { clicks: 0, cost: 0, conversions: 0, conversionValue: 0, impressions: 0, instancias: 0, n }
        cur.clicks += row.clicks
        cur.cost += row.cost
        cur.conversions += row.conversions
        cur.conversionValue += row.conversionValue
        cur.impressions += row.impressions
        cur.instancias += 1
        mapa.set(chave, cur)
      }
    }
  }
  const out: NgramAgg[] = []
  for (const [chave, a] of mapa) {
    const fragmento = chave.slice(chave.indexOf(':') + 1)
    out.push({
      fragmento, n: a.n, instancias: a.instancias,
      clicks: a.clicks, cost: a.cost, conversions: a.conversions,
      conversionValue: a.conversionValue, impressions: a.impressions,
      ctr: a.impressions > 0 ? a.clicks / a.impressions : 0,
      cpc: a.clicks > 0 ? a.cost / a.clicks : 0,
      cvr: a.clicks > 0 ? a.conversions / a.clicks : 0,
      cpa: a.conversions > 0 ? a.cost / a.conversions : null,
      roas: a.cost > 0 ? a.conversionValue / a.cost : null,
    })
  }
  return out.sort((x, y) => y.cost - x.cost || x.fragmento.localeCompare(y.fragmento))
}


export const MIN_CLIQUES_NEGATIVA = 150

export type NgramVeredito = 'negativar' | 'mau_pagador' | 'ok'


export function classificarNgram(a: NgramAgg, opts: { cpaTeto?: number; minCliques?: number }): NgramVeredito {
  const min = opts.minCliques ?? MIN_CLIQUES_NEGATIVA
  if (a.clicks > min && a.conversions === 0) return 'negativar'
  if (a.conversions > 1 && a.clicks > min && opts.cpaTeto != null && a.cpa != null && a.cpa > opts.cpaTeto) {
    return 'mau_pagador'
  }
  return 'ok'
}


export function ordenarDesperdicio(aggs: NgramAgg[], opts?: { minCliques?: number }): NgramAgg[] {
  const min = opts?.minCliques ?? MIN_CLIQUES_NEGATIVA
  return aggs
    .filter((a) => a.conversions === 0 && a.clicks > min)
    .sort((x, y) => y.cost - x.cost || x.fragmento.localeCompare(y.fragmento))
}


export function ordenarMauPagador(aggs: NgramAgg[], opts?: { minCliques?: number }): NgramAgg[] {
  const min = opts?.minCliques ?? MIN_CLIQUES_NEGATIVA
  return aggs
    .filter((a) => a.conversions > 1 && a.cpa != null && a.clicks > min)
    .sort((x, y) => (y.cpa as number) - (x.cpa as number) || x.fragmento.localeCompare(y.fragmento))
}
