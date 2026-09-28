
import { withTimeout } from '@/lib/withTimeout'


export interface MemoOpts { timeoutMs?: number }

export interface TtlMemo<T> { get(): Promise<T>; invalidate(): void }

export function memoizeAsync<T>(
  loader: () => Promise<T>,
  ttlMs: number,
  now: () => number = Date.now,
): TtlMemo<T> {
  let cached: { value: T; expiresAt: number } | null = null
  return {
    async get(): Promise<T> {
      if (cached && cached.expiresAt > now()) return cached.value
      const value = await loader()
      cached = { value, expiresAt: now() + ttlMs }
      return value
    },
    invalidate(): void { cached = null },
  }
}


export interface TtlMemoByKey<T> { get(key: string): Promise<T>; invalidate(key?: string): void }

export function memoizeAsyncByKey<T>(
  loader: (key: string) => Promise<T>,
  ttlMs: number,
  now: () => number = Date.now,
  opts: MemoOpts = {},
): TtlMemoByKey<T> {
  const cache = new Map<string, { value: T; expiresAt: number }>()
  const load = opts.timeoutMs
    ? (key: string) => withTimeout(loader(key), opts.timeoutMs!, 'memoize')
    : loader
  return {
    async get(key: string): Promise<T> {
      const hit = cache.get(key)
      if (hit && hit.expiresAt > now()) return hit.value
      const value = await load(key)
      cache.set(key, { value, expiresAt: now() + ttlMs })
      return value
    },
    invalidate(key?: string): void {
      if (key === undefined) cache.clear()
      else cache.delete(key)
    },
  }
}
