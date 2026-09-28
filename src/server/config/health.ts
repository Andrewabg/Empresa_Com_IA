
import { getSecret, SECRET_KEYS } from '../secrets'
import { testComposioKey } from '../actions/composio'

export interface ComposioHealth {
  configured: boolean
  ok?: boolean
  reason?: string
}

export interface CheckHealthDeps {
  
  getKey?: () => Promise<string | null>
  
  testKey?: (apiKey: string) => Promise<{ ok: boolean; error?: string }>
  
  now?: () => number
}

const HEALTH_TTL_MS = 60_000
let _cache: { at: number; result: ComposioHealth } | null = null


export function invalidateComposioHealthCache(): void { _cache = null }


export async function checkComposioHealth(deps: CheckHealthDeps = {}): Promise<ComposioHealth> {
  const now = deps.now ?? Date.now
  const cached = _cache
  if (cached && now() - cached.at < HEALTH_TTL_MS) return cached.result

  const getKey = deps.getKey ?? (() => getSecret(SECRET_KEYS.composio_api_key))
  const testKey = deps.testKey ?? testComposioKey

  const apiKey = await getKey()
  let result: ComposioHealth
  if (!apiKey) {
    result = { configured: false } 
  } else {
    const r = await testKey(apiKey)
    result = r.ok ? { configured: true, ok: true } : { configured: true, ok: false, reason: r.error }
  }
  _cache = { at: now(), result }
  return result
}
