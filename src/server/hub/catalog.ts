
















import { randomUUID } from 'node:crypto'
import { getSetting, setSetting } from '@/data/settings'
import {
  readCatalogCache,
  writeCatalogCache,
  type CatalogEntry,
  type CatalogFirehose,
} from '@/server/catalog/cache'
import { getSecret } from '@/server/secrets'
import { readBodyCapped, HUB_MAX_BYTES } from '@/server/http/readBodyCapped'


const INSTANCE_ID_KEY = 'instance_id'

const CATALOG_PATH = '/api/hub/catalog'

const MAX_CATALOG_ENTRIES = 1000
const MAX_DEFINITION_BYTES = 64_000

const TIMEOUT_MS = 5000

const DEFAULT_HUB_URL = 'https://elitedaia.com.br'


export interface FetchCatalogDeps {
  now?: number
  fetchImpl?: typeof fetch
}


function parseFirehose(raw: unknown): CatalogFirehose | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const granted = (raw as { granted?: unknown }).granted
  const reason = (raw as { reason?: unknown }).reason
  
  
  if (typeof granted !== 'boolean' || typeof reason !== 'string' || reason.length > 256) return undefined
  return { granted, reason }
}


function parseEnvelope(json: unknown): { entries: CatalogEntry[]; firehose?: CatalogFirehose } | null {
  if (!json || typeof json !== 'object') return null
  const data = (json as { data?: unknown }).data
  if (!data || typeof data !== 'object') return null
  const catalog = (data as { catalog?: unknown }).catalog
  if (!Array.isArray(catalog)) return null
  if (catalog.length > MAX_CATALOG_ENTRIES) return null 

  const entries: CatalogEntry[] = []
  for (const raw of catalog) {
    if (!raw || typeof raw !== 'object') return null
    const slug = (raw as { slug?: unknown }).slug
    const kind = (raw as { kind?: unknown }).kind
    if (typeof slug !== 'string' || typeof kind !== 'string') return null
    const version = (raw as { version?: unknown }).version
    const category = (raw as { category?: unknown }).category
    const definition = (raw as { definition?: unknown }).definition
    const defObj = definition && typeof definition === 'object' ? (definition as Record<string, unknown>) : {}
    
    try { if (JSON.stringify(defObj).length > MAX_DEFINITION_BYTES) return null } catch { return null }
    entries.push({
      slug,
      kind,
      version: typeof version === 'number' ? version : 0,
      category: typeof category === 'string' ? category : null,
      definition: defObj,
    })
  }
  return { entries, firehose: parseFirehose((data as { firehose?: unknown }).firehose) }
}


async function postOnce(
  fetchImpl: typeof fetch,
  url: string,
  body: string,
): Promise<{ entries: CatalogEntry[]; firehose?: CatalogFirehose }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`hub catalog: HTTP ${res.status}`)
    
    
    const capped = await readBodyCapped(res, HUB_MAX_BYTES)
    if (!capped.ok) throw new Error(`hub catalog: resposta ${capped.reason}`)
    let json: unknown
    try { json = JSON.parse(capped.text) } catch { throw new Error('hub catalog: JSON inválido') }
    const parsed = parseEnvelope(json)
    if (!parsed) throw new Error('hub catalog: envelope inválido')
    return parsed
  } finally {
    clearTimeout(timer)
  }
}


export async function fetchCatalog(
  kinds?: string[],
  deps: FetchCatalogDeps = {},
): Promise<CatalogEntry[]> {
  const hubUrl = process.env.HUB_URL || DEFAULT_HUB_URL
  const fetchImpl = deps.fetchImpl ?? fetch
  const now = deps.now ?? Date.now()

  
  let licenseKey: string | null = null
  try {
    licenseKey = await getSecret('license_key')
  } catch {
    licenseKey = null
  }

  
  let instanceId = await getSetting(INSTANCE_ID_KEY)
  if (!instanceId) {
    instanceId = randomUUID()
    await setSetting(INSTANCE_ID_KEY, instanceId)
  }

  const url = `${hubUrl.replace(/\/+$/, '')}${CATALOG_PATH}`
  const body = JSON.stringify({
    ...(licenseKey ? { license_key: licenseKey } : {}),
    instance_id: instanceId,
    ...(kinds ? { kinds } : {}),
  })

  
  let result: { entries: CatalogEntry[]; firehose?: CatalogFirehose } | null = null
  for (let attempt = 0; attempt < 2 && !result; attempt++) {
    try {
      result = await postOnce(fetchImpl, url, body)
    } catch {
      result = null
    }
  }

  
  if (!result) {
    return (await readCatalogCache())?.entries ?? []
  }

  
  await writeCatalogCache({
    entries: result.entries,
    last_ok_at: new Date(now).toISOString(),
    ...(result.firehose ? { firehose: result.firehose } : {}),
  })
  return result.entries
}


export const CATALOG_TTL_MS = 60 * 60 * 1000


export function isCatalogStale(
  lastOkAt: string | null | undefined,
  now: number,
): boolean {
  if (!lastOkAt) return true
  return now - Date.parse(lastOkAt) > CATALOG_TTL_MS
}


function filterByKinds(entries: CatalogEntry[], kinds?: string[]): CatalogEntry[] {
  if (!kinds || kinds.length === 0) return entries
  const want = new Set(kinds)
  return entries.filter((e) => want.has(e.kind))
}


export async function getCatalog(kinds?: string[]): Promise<CatalogEntry[]> {
  const cache = await readCatalogCache()

  
  if (!cache) {
    const entries = await fetchCatalog().catch(() => [] as CatalogEntry[])
    return filterByKinds(entries, kinds)
  }

  
  if (isCatalogStale(cache.last_ok_at, Date.now())) {
    void fetchCatalog().catch(() => {})
  }

  return filterByKinds(cache.entries, kinds)
}


export async function getCatalogCached(kinds?: string[]): Promise<CatalogEntry[]> {
  const cache = await readCatalogCache()
  if (!cache) return []
  return filterByKinds(cache.entries, kinds)
}
