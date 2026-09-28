












import { getSetting, setSetting } from '@/data/settings'


export const CATALOG_CACHE_KEY = 'catalog_cache'


export interface CatalogEntry {
  slug: string
  kind: string
  version: number
  category: string | null
  definition: Record<string, unknown>
}


export interface CatalogFirehose {
  granted: boolean
  reason: string
}


export interface CatalogCache {
  entries: CatalogEntry[]
  
  last_ok_at: string
  
  firehose?: CatalogFirehose
}


export async function readCatalogCache(): Promise<CatalogCache | null> {
  const raw = await getSetting(CATALOG_CACHE_KEY)
  if (raw == null) return null
  try {
    return JSON.parse(raw) as CatalogCache
  } catch {
    return null
  }
}


export async function writeCatalogCache(snap: CatalogCache): Promise<void> {
  await setSetting(CATALOG_CACHE_KEY, JSON.stringify(snap))
}


export async function readCatalogFirehose(): Promise<CatalogFirehose | null> {
  return (await readCatalogCache())?.firehose ?? null
}
