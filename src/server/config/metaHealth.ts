
import { getComposioClient, composioUserId, type ComposioClient } from '../actions/composio'
import { runAction, type ActionResponse, type RunActionInput } from '../actions/actions'
import { listConnectedToolkitSlugs } from './connections'


export type MetaHealth = 'ok' | 'expired' | 'absent' | 'unconfigured'

const META_SLUG = 'metaads'
const READ_SLUG = 'METAADS_GET_AD_ACCOUNTS'

export interface MetaHealthDeps {
  getClient?: () => Promise<ComposioClient | null>
  
  listConnected?: () => Promise<string[]>
  
  runAction?: (input: RunActionInput, composio?: ComposioClient | null) => Promise<ActionResponse>
  now?: () => number
}

const TTL_MS = 60_000
let _health: { at: number; status: MetaHealth } | null = null


export function invalidateMetaHealthCache(): void {
  _health = null
}


function countAccounts(data: unknown): number {
  const arr = findArray(data, 0)
  return arr ? arr.length : 0
}

function findArray(value: unknown, depth: number): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth > 3) return null
  const obj = value as Record<string, unknown>
  for (const key of ['data', 'accounts', 'adaccounts', 'ad_accounts', 'results', 'items']) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[]
  }
  for (const v of Object.values(obj)) {
    const found = findArray(v, depth + 1)
    if (found) return found
  }
  return null
}

async function compute(deps: MetaHealthDeps): Promise<MetaHealth> {
  const getClient = deps.getClient ?? getComposioClient
  const listConnected = deps.listConnected ?? (() => listConnectedToolkitSlugs())
  const run = deps.runAction ?? runAction

  const client = await getClient()
  if (!client) return 'unconfigured'

  const slugs = await listConnected()
  if (!slugs.includes(META_SLUG)) return 'absent'

  
  
  
  const res = await run(
    { slug: READ_SLUG, args: {}, userId: composioUserId(), agent: 'gestor-trafego' },
    client,
  )
  if (res.successful && countAccounts(res.data) >= 1) return 'ok'
  return 'expired'
}


export async function checkMetaReadHealth(deps: MetaHealthDeps = {}): Promise<MetaHealth> {
  const now = deps.now ?? Date.now
  if (_health && now() - _health.at < TTL_MS) return _health.status
  let status: MetaHealth
  try {
    status = await compute(deps)
  } catch {
    status = 'expired'
  }
  _health = { at: now(), status }
  return status
}
