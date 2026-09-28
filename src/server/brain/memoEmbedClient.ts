
















import type { EmbedClient } from '@/brain/embeddings'
import { EmbedCache, type EmbedCacheOptions } from '@/lib/embed-cache'


const DEFAULT_CAPACITY = 48

const DEFAULT_TTL_MS = 90_000

export class MemoEmbedClient implements EmbedClient {
  
  private inflight = new Map<string, Promise<number[][]>>()
  
  private cache: EmbedCache

  constructor(private inner: EmbedClient, opts?: Partial<EmbedCacheOptions>) {
    this.cache = new EmbedCache({
      capacity: opts?.capacity ?? DEFAULT_CAPACITY,
      ttlMs: opts?.ttlMs ?? DEFAULT_TTL_MS,
      
      
      now: opts?.now ?? Date.now,
    })
  }

  embed(texts: string[]): Promise<number[][]> {
    
    
    try {
      const hit = this.cache.get(texts)
      if (hit) return Promise.resolve(hit)
    } catch {
      
    }

    
    
    const key = JSON.stringify(texts)
    const pending = this.inflight.get(key)
    if (pending) return pending

    
    const result = this.inner.embed(texts)
    this.inflight.set(key, result)
    result.then(
      (vecs) => {
        
        try { this.cache.put(texts, vecs) } catch {  }
        if (this.inflight.get(key) === result) this.inflight.delete(key)
      },
      () => {
        
        if (this.inflight.get(key) === result) this.inflight.delete(key)
      },
    )
    return result
  }
}
