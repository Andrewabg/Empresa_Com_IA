





function spaceNorm(s: string): string {
  return s.replace(/[  ]/g, ' ')
}


export function fmtBRL(n: number): string {
  return spaceNorm(
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  )
}


export function fmtPct(fraction: number, digits = 2): string {
  const pct = fraction * 100
  return (
    pct.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) +
    '%'
  )
}

export type DeltaTone = 'up' | 'down' | 'flat'
export interface DeltaFmt {
  label: string
  tone: DeltaTone
}


export function fmtDelta(n: number): DeltaFmt {
  const pctInt = Math.round(Math.abs(n) * 100)
  if (n === 0 || pctInt === 0) return { label: '—', tone: 'flat' }
  return n > 0
    ? { label: `▲${pctInt}%`, tone: 'up' }
    : { label: `▼${pctInt}%`, tone: 'down' }
}


export interface AdsManagerArgs {
  
  accountId: string
  level: 'account' | 'campaign' | 'adset' | 'ad'
  
  entityId?: string
}

const NIVEL_MAP: Record<AdsManagerArgs['level'], { path: string; param?: string }> = {
  account: { path: 'campaigns' },
  campaign: { path: 'campaigns', param: 'selected_campaign_ids' },
  adset: { path: 'adsets', param: 'selected_adset_ids' },
  ad: { path: 'ads', param: 'selected_ad_ids' },
}


export function adsManagerUrl({ accountId, level, entityId }: AdsManagerArgs): string {
  const act = accountId.replace(/^act_/, '')
  const { path, param } = NIVEL_MAP[level]
  let url = `https://adsmanager.facebook.com/adsmanager/manage/${path}?act=${act}`
  if (param && entityId) url += `&${param}=${entityId}`
  return url
}
