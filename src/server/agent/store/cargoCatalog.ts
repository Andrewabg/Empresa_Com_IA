
import { getCatalog, getCatalogCached } from '@/server/hub/catalog'
import type { MarketingSeed } from './marketingSeeds'


export type CargoCatalogItem = MarketingSeed & { category: string | null }


function isWellFormedSeed(def: unknown): def is MarketingSeed {
  if (!def || typeof def !== 'object') return false
  const d = def as Record<string, unknown>
  return typeof d.tools === 'object' && d.tools !== null && Array.isArray(d.skills)
}


export const MAX_SYSTEM_PROMPT_CHARS = 20_000


export function isInstallableSeed(seed: unknown): seed is MarketingSeed {
  if (!isWellFormedSeed(seed)) return false
  const s = seed as unknown as Record<string, unknown>
  if (typeof s.system_prompt !== 'string' || s.system_prompt.trim().length === 0) return false
  if (s.system_prompt.length > MAX_SYSTEM_PROMPT_CHARS) return false
  if (typeof s.name !== 'string' || s.name.trim().length === 0 || s.name.length > 200) return false
  if (typeof s.role !== 'string' || s.role.length > 200) return false
  return true
}


export interface GetCargoCatalogOpts {
  
  cacheOnly?: boolean
}


export async function getCargoCatalog(opts?: GetCargoCatalogOpts): Promise<CargoCatalogItem[]> {
  const entries = opts?.cacheOnly
    ? await getCatalogCached(['cargo'])
    : await getCatalog(['cargo'])
  const seeds: CargoCatalogItem[] = []
  for (const e of entries) {
    if (!isWellFormedSeed(e.definition)) {
      console.warn('[getCargoCatalog] entrada de cargo malformada descartada (sem tools/skills):', e.slug)
      continue
    }
    seeds.push({ ...(e.definition as unknown as MarketingSeed), category: e.category })
  }
  return seeds
}
