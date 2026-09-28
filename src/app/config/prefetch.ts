










export const CONFIG_CARD_URLS = [
  '/api/license',
  '/api/config/connections',
  '/api/config/canais',
  '/api/config/telegram',
  '/api/config/ui',
  '/api/config/brand',
  '/api/config/atalhos',
  '/api/config/updates',
] as const

const PREFETCH_TTL_MS = 15_000

const inflight = new Map<string, { p: Promise<Response>; at: number }>()


export function prefetchConfigCards(): void {
  const now = Date.now()
  for (const url of CONFIG_CARD_URLS) {
    const cur = inflight.get(url)
    if (cur && now - cur.at < PREFETCH_TTL_MS) continue
    const p = fetch(url)
    void p.catch(() => {})
    inflight.set(url, { p, at: now })
  }
}


export function takePrefetched(url: string): Promise<Response> | null {
  const entry = inflight.get(url) ?? null
  if (!entry) return null
  inflight.delete(url)
  return Date.now() - entry.at < PREFETCH_TTL_MS ? entry.p : null
}
