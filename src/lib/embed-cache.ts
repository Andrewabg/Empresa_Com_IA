












export function hashTexts(texts: string[]): string {
  
  const s = JSON.stringify(texts)
  let h = 0x811c9dc5 
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    
    h = Math.imul(h, 0x01000193) >>> 0
  }
  
  return `${s.length}:${h.toString(16)}`
}

interface Entry {
  value: number[][]
  
  storedAt: number
}

export interface EmbedCacheOptions {
  
  capacity: number
  
  ttlMs: number
  
  now: () => number
}


export class EmbedCache {
  
  
  private map = new Map<string, Entry>()
  private readonly capacity: number
  private readonly ttlMs: number
  private readonly now: () => number

  constructor(opts: EmbedCacheOptions) {
    
    this.capacity = Math.max(1, Math.floor(opts.capacity))
    this.ttlMs = Math.max(0, opts.ttlMs)
    this.now = opts.now
  }

  
  get(texts: string[]): number[][] | undefined {
    const key = hashTexts(texts)
    const entry = this.map.get(key)
    if (!entry) return undefined
    if (this.now() - entry.storedAt >= this.ttlMs) {
      
      this.map.delete(key)
      return undefined
    }
    
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  
  put(texts: string[], value: number[][]): void {
    const key = hashTexts(texts)
    if (this.map.has(key)) this.map.delete(key) 
    this.map.set(key, { value, storedAt: this.now() })
    while (this.map.size > this.capacity) {
      
      const oldest = this.map.keys().next().value as string | undefined
      if (oldest === undefined) break
      this.map.delete(oldest)
    }
  }

  
  get size(): number {
    return this.map.size
  }
}
