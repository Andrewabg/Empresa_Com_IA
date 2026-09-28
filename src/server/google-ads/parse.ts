






import type { SearchTermRow } from '@/lib/google-ads/types'


export const MICROS_POR_UNIDADE = 1_000_000


export interface CampanhaRow {
  id: string
  name: string
  status: string
  
  cost: number
  clicks: number
  impressions: number
  conversions: number
  
  ctr: number
}


export function microsParaReais(micros: string): number {
  if (micros == null || micros === '') return 0
  const n = typeof micros === 'number' ? micros : parseFloat(String(micros))
  if (isNaN(n)) return 0
  return n / MICROS_POR_UNIDADE
}


export function extrairCustomerIds(resposta: unknown): string[] {
  try {
    if (!resposta || typeof resposta !== 'object') return []
    const obj = resposta as Record<string, unknown>
    const resourceNames = obj['resourceNames']
    if (!Array.isArray(resourceNames)) return []
    return resourceNames.map((rn: unknown) =>
      typeof rn === 'string' ? rn.replace(/^customers\//, '') : String(rn),
    )
  } catch {
    return []
  }
}


function numOu0(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}


function strOu(v: unknown): string {
  if (v == null) return ''
  return String(v)
}


export function parseSearchStreamCampanhas(batches: unknown): CampanhaRow[] {
  try {
    if (!Array.isArray(batches)) return []
    const linhas: CampanhaRow[] = []
    for (const batch of batches) {
      if (!batch || typeof batch !== 'object') continue
      const results = (batch as Record<string, unknown>)['results']
      if (!Array.isArray(results)) continue
      for (const row of results) {
        if (!row || typeof row !== 'object') continue
        const r = row as Record<string, unknown>
        const campaign = (r['campaign'] ?? {}) as Record<string, unknown>
        const metrics = (r['metrics'] ?? {}) as Record<string, unknown>
        linhas.push({
          id: strOu(campaign['id']),
          name: strOu(campaign['name']),
          status: strOu(campaign['status']),
          
          cost: microsParaReais(metrics['costMicros'] as string),
          clicks: numOu0(metrics['clicks']),
          impressions: numOu0(metrics['impressions']),
          conversions: numOu0(metrics['conversions']),
          ctr: numOu0(metrics['ctr']),
        })
      }
    }
    return linhas
  } catch {
    return []
  }
}


export function parseSearchStreamSearchTerms(batches: unknown): SearchTermRow[] {
  try {
    if (!Array.isArray(batches)) return []
    const linhas: SearchTermRow[] = []
    for (const batch of batches) {
      if (!batch || typeof batch !== 'object') continue
      const results = (batch as Record<string, unknown>)['results']
      if (!Array.isArray(results)) continue
      for (const row of results) {
        if (!row || typeof row !== 'object') continue
        const r = row as Record<string, unknown>
        const searchTermView = (r['searchTermView'] ?? {}) as Record<string, unknown>
        const metrics = (r['metrics'] ?? {}) as Record<string, unknown>
        linhas.push({
          termo: strOu(searchTermView['searchTerm']),
          clicks: numOu0(metrics['clicks']),
          
          cost: microsParaReais(metrics['costMicros'] as string),
          conversions: numOu0(metrics['conversions']),
          
          conversionValue: numOu0(metrics['conversionsValue']),
          impressions: numOu0(metrics['impressions']),
        })
      }
    }
    return linhas
  } catch {
    return []
  }
}
