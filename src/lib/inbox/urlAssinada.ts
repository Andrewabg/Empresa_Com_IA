









export const VALIDADE_URL_S = 3600


export const MARGEM_URL_MS = 10 * 60_000


export const TETO_CACHE_URLS = 500

export interface UrlAssinadaEmCache {
  url: string
  
  expiraEmMs: number
}


export function urlAindaServe(entrada: UrlAssinadaEmCache | undefined, agoraMs: number): boolean {
  if (!entrada || !entrada.url) return false
  if (!Number.isFinite(entrada.expiraEmMs) || !Number.isFinite(agoraMs)) return false
  return entrada.expiraEmMs - agoraMs > MARGEM_URL_MS
}


export function podarCache<T extends UrlAssinadaEmCache>(
  cache: Map<string, T>,
  agoraMs: number,
  teto = TETO_CACHE_URLS,
): Map<string, T> {
  for (const [chave, valor] of cache) {
    if (!urlAindaServe(valor, agoraMs)) cache.delete(chave)
  }
  if (cache.size <= teto) return cache
  const porVencimento = [...cache.entries()].sort((a, b) => a[1].expiraEmMs - b[1].expiraEmMs)
  for (const [chave] of porVencimento.slice(0, cache.size - teto)) cache.delete(chave)
  return cache
}
