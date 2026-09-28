
import { Composio } from '@composio/core'
import { getSecret, SECRET_KEYS } from '../secrets'

export type ComposioClient = Composio

const COMPOSIO_USER = 'operator'


export function composioUserId(): string {
  return process.env.COMPOSIO_USER_ID ?? COMPOSIO_USER
}


let _cache: { key: string; client: Promise<ComposioClient | null> } | null = null


export function invalidateComposioClientCache(): void {
  _cache = null
}


export async function getComposioClient(): Promise<ComposioClient | null> {
  
  const cached = _cache
  if (cached !== null) return cached.client

  
  const apiKey = await getSecret(SECRET_KEYS.composio_api_key)

  
  if (!apiKey) return null

  
  const raceCheck = _cache
  if (raceCheck !== null) return raceCheck.client

  
  
  const clientPromise = Promise.resolve(new Composio({ apiKey, allowTracking: false }))
  _cache = { key: apiKey, client: clientPromise }

  
  clientPromise.catch(() => {
    if (_cache?.key === apiKey) _cache = null
  })

  return clientPromise
}


export async function resolverContaMetaads(c: ComposioClient): Promise<string | null> {
  const conns = await c.connectedAccounts.list({ userIds: [composioUserId()] }, { signal: AbortSignal.timeout(10000) })
  const items = (conns as { items?: Array<{ id?: string; toolkit?: { slug?: string }; toolkitSlug?: string }> })?.items ?? []
  return items.find((a) => (a?.toolkit?.slug ?? a?.toolkitSlug) === 'metaads')?.id ?? null
}


export async function metaGraphGet(
  path: string,
  composio?: ComposioClient | null,
  connectedAccountId?: string | null,
): Promise<Record<string, unknown> | null> {
  const c = composio === undefined ? await getComposioClient() : composio
  if (!c) return null
  try {
    const caId = connectedAccountId ?? (await resolverContaMetaads(c))
    if (!caId) return null
    const res = (await (c.tools as { proxyExecute: (a: unknown, o?: unknown) => Promise<{ data?: unknown }> }).proxyExecute({
      endpoint: path, method: 'GET', connectedAccountId: caId,
    }, { signal: AbortSignal.timeout(15000) })) as { data?: unknown }
    return (res?.data ?? null) as Record<string, unknown> | null
  } catch (e) {
    console.warn('[metaGraphGet] falhou (fail-open):', e instanceof Error ? e.message : e)
    return null
  }
}

export type GraphResposta =
  | { ok: true; status: number; data: unknown; headers: Record<string, string> }
  | { ok: false; tipo: 'nao_configurado' | 'sem_conta' | 'meta' | 'rede'; status?: number; code?: number; subcode?: number; message: string; headers: Record<string, string> }

function headersDe(res: unknown): Record<string, string> {
  const h = (res as { headers?: unknown })?.headers
  if (!h || typeof h !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(h as Record<string, unknown>)) if (typeof v === 'string') out[k.toLowerCase()] = v
  return out
}


export async function metaGraphGetDetalhado(
  path: string,
  opts: { composio?: ComposioClient | null; connectedAccountId?: string | null; signal?: AbortSignal } = {},
): Promise<GraphResposta> {
  const c = opts.composio === undefined ? await getComposioClient() : opts.composio
  if (!c) return { ok: false, tipo: 'nao_configurado', message: 'Ações externas não configuradas.', headers: {} }
  let caId: string | null = null
  try {
    caId = opts.connectedAccountId ?? (await resolverContaMetaads(c))
  } catch (e) {
    return { ok: false, tipo: 'rede', message: e instanceof Error ? e.message : String(e), headers: {} }
  }
  if (!caId) return { ok: false, tipo: 'sem_conta', message: 'Meta Ads não conectado.', headers: {} }
  try {
    const res = (await (c.tools as { proxyExecute: (a: unknown, o?: unknown) => Promise<unknown> }).proxyExecute(
      { endpoint: path, method: 'GET', connectedAccountId: caId },
      { signal: opts.signal ?? AbortSignal.timeout(15000) },
    )) as { data?: unknown; status?: number }
    const headers = headersDe(res)
    const status = typeof res?.status === 'number' ? res.status : 200
    const erro = (res?.data as { error?: { message?: unknown; code?: unknown; error_subcode?: unknown } } | undefined)?.error
    if (status >= 400 || erro) {
      return {
        ok: false, tipo: 'meta', status,
        code: typeof erro?.code === 'number' ? erro.code : undefined,
        subcode: typeof erro?.error_subcode === 'number' ? erro.error_subcode : undefined,
        message: typeof erro?.message === 'string' ? erro.message : `HTTP ${status}`,
        headers,
      }
    }
    return { ok: true, status, data: res?.data ?? null, headers }
  } catch (e) {
    const err = e as { status?: number; statusCode?: number; message?: string }
    return { ok: false, tipo: 'rede', status: err.status ?? err.statusCode, message: err.message ?? 'erro no Graph', headers: {} }
  }
}


export async function metaGraphPost(
  endpoint: string,
  body: Record<string, unknown>,
  deps: { composio?: ComposioClient | null; connectedAccountId?: string | null } = {},
): Promise<{ ok: boolean; data?: unknown; error?: string; status?: number }> {
  const c = deps.composio === undefined ? await getComposioClient() : deps.composio
  if (!c) return { ok: false, error: 'Ações externas não configuradas.' }
  try {
    const caId = deps.connectedAccountId ?? (await resolverContaMetaads(c))
    if (!caId) return { ok: false, error: 'Meta Ads não conectado.' }
    const res = (await (c.tools as { proxyExecute: (a: unknown, o?: unknown) => Promise<{ data?: unknown }> }).proxyExecute({
      endpoint, method: 'POST', body, connectedAccountId: caId,
    }, { signal: AbortSignal.timeout(15000) })) as { data?: unknown }
    return { ok: true, data: res?.data ?? null }
  } catch (e) {
    
    
    
    const err = e as { status?: number; statusCode?: number; message?: string }
    return { ok: false, error: err.message ?? 'erro no Graph', status: err.status ?? err.statusCode }
  }
}


export async function testComposioKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const c = new Composio({ apiKey, allowTracking: false })
    
    
    
    
    await c.tools.getRawComposioTools({ toolkits: ['github'], limit: 1 }, undefined, { signal: AbortSignal.timeout(10000) })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'chave inválida' }
  }
}
