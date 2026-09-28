
import { getSettings } from '@/data/settings'
import { getPrimaryAgentName } from '@/data/agents'
import { memoizeAsync } from '@/server/cache/ttlMemoize'
import {
  BRAND_SETTING_KEYS,
  DEFAULT_BRANDING,
  resolveBranding,
  type Branding,
} from '@/lib/branding'

async function getBrandingUncached(): Promise<Branding> {
  try {
    const map = await getSettings([...BRAND_SETTING_KEYS])
    const b = resolveBranding(Object.fromEntries(map))
    
    
    const name = await getPrimaryAgentName().catch(() => null)
    return { ...b, assistantName: name?.trim() || b.assistantName }
  } catch (e) {
    console.warn('[branding] leitura dos settings falhou (fail-open → fábrica):', e)
    return DEFAULT_BRANDING
  }
}

const _brandingMemo = memoizeAsync(getBrandingUncached, 60_000)

export async function getBranding(): Promise<Branding> {
  return _brandingMemo.get()
}


export function invalidateBrandingCache(): void {
  _brandingMemo.invalidate()
}
