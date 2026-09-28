












import { getSetting, setSetting, getSettings } from '@/data/settings'
import type { LicenseCache } from '@/lib/license-state'


export const LICENSE_CACHE_KEY = 'license_cache'


export const FIRST_ACTIVATED_AT_KEY = 'license_first_activated_at'


type LicenseSnapshot = NonNullable<LicenseCache>


export async function readLicenseCache(): Promise<LicenseCache | null> {
  const raw = await getSetting(LICENSE_CACHE_KEY)
  if (raw == null) return null
  try {
    return JSON.parse(raw) as LicenseCache
  } catch {
    return null
  }
}


export async function writeLicenseCache(snap: LicenseSnapshot): Promise<void> {
  await setSetting(LICENSE_CACHE_KEY, JSON.stringify(snap))
}


export async function readFirstActivatedAt(): Promise<number | null> {
  const raw = await getSetting(FIRST_ACTIVATED_AT_KEY)
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}


export async function markFirstActivated(nowMs: number): Promise<void> {
  const existing = await getSetting(FIRST_ACTIVATED_AT_KEY)
  if (existing != null) return
  await setSetting(FIRST_ACTIVATED_AT_KEY, String(nowMs))
}


export async function readEngineGateInputs(): Promise<{
  cache: LicenseCache
  firstActivatedAt: number | null
}> {
  const m = await getSettings([LICENSE_CACHE_KEY, FIRST_ACTIVATED_AT_KEY])

  let cache: LicenseCache = null
  const rawCache = m.get(LICENSE_CACHE_KEY)
  if (rawCache != null) {
    try {
      cache = JSON.parse(rawCache) as LicenseCache
    } catch {
      cache = null
    }
  }

  const rawFirst = m.get(FIRST_ACTIVATED_AT_KEY)
  const n = rawFirst != null ? Number(rawFirst) : NaN
  return { cache, firstActivatedAt: Number.isFinite(n) ? n : null }
}
