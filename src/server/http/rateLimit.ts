




export interface RateLimiterOpts {
  capacidade: number
  refilPorSegundo: number
  agora?: () => number
  
  maxChaves?: number
}

interface Bucket { tokens: number; ts: number }

export interface RateLimiter {
  permitir: (chave: string) => boolean
  
  tamanho: () => number
}


export const MAX_CHAVES_PADRAO = 5000

export function criarRateLimiter(opts: RateLimiterOpts): RateLimiter {
  const agora = opts.agora ?? (() => Date.now())
  const maxChaves = opts.maxChaves ?? MAX_CHAVES_PADRAO
  const buckets = new Map<string, Bucket>()

  
  function tokensAgora(b: Bucket, t: number): number {
    return Math.min(opts.capacidade, b.tokens + ((t - b.ts) / 1000) * opts.refilPorSegundo)
  }

  function podar(t: number): void {
    
    
    for (const [k, b] of buckets) {
      if (tokensAgora(b, t) >= opts.capacidade) buckets.delete(k)
    }
    if (buckets.size < maxChaves) return
    
    
    
    
    
    const porFolga = [...buckets.entries()].sort(
      (x, y) => tokensAgora(y[1], t) - tokensAgora(x[1], t) || x[1].ts - y[1].ts,
    )
    for (const [k] of porFolga.slice(0, Math.ceil(buckets.size / 2))) buckets.delete(k)
  }

  return {
    permitir(chave: string): boolean {
      const t = agora()
      let b = buckets.get(chave)
      if (!b) {
        if (buckets.size >= maxChaves) podar(t)
        b = { tokens: opts.capacidade, ts: t }
      }
      b.tokens = tokensAgora(b, t)
      b.ts = t
      if (b.tokens < 1) { buckets.set(chave, b); return false }
      b.tokens -= 1
      buckets.set(chave, b)
      return true
    },
    tamanho: () => buckets.size,
  }
}


export const webhookRateLimiter = criarRateLimiter({ capacidade: 20, refilPorSegundo: 1 })


export const registroDeRecusaRateLimiter = criarRateLimiter({ capacidade: 30, refilPorSegundo: 0.5 })


export const CHAVE_RECUSA_GLOBAL = 'canal:recusa'
