




export interface LinhaHora {
  
  hora: number
  spend: number
  impressions: number
}

const numero = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}


function horaDe(v: unknown): number | undefined {
  if (typeof v !== 'string') return undefined
  const m = /^(\d{2}):/.exec(v.trim())
  if (!m) return undefined
  const h = Number(m[1])
  return Number.isInteger(h) && h >= 0 && h <= 23 ? h : undefined
}


export function parseHoras(linhas: unknown): LinhaHora[] {
  if (!Array.isArray(linhas)) return []
  const out: LinhaHora[] = []
  for (const l of linhas) {
    if (!l || typeof l !== 'object') continue
    const r = l as Record<string, unknown>
    const hora = horaDe(r.hourly_stats_aggregated_by_advertiser_time_zone)
    if (hora === undefined) continue
    out.push({ hora, spend: numero(r.spend), impressions: numero(r.impressions) })
  }
  return out.sort((a, b) => a.hora - b.hora)
}
