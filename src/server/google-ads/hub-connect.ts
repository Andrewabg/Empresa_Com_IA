







import { getHubUrl } from '@/server/hub/client'


const TIMEOUT_MS = 15_000


export type HubConnectResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string | undefined; status: number }


export interface HubConnectDeps {
  hubUrl?: string
  fetch?: typeof fetch
}

type ConnectPath = 'auth-url' | 'accounts' | 'select' | 'disconnect'


async function postHubConnect<T>(
  hubUrl: string,
  path: ConnectPath,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<HubConnectResult<T>> {
  const url = `${hubUrl.replace(/\/+$/, '')}/api/hub/google-ads/${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    
    return { ok: false, code: 'NETWORK', status: 0 }
  } finally {
    clearTimeout(timer)
  }

  if (res.ok) {
    let json: unknown
    try {
      json = await res.json()
    } catch {
      return { ok: false, code: 'BAD_RESPONSE', status: res.status }
    }
    const data = (json as { data?: unknown })?.data
    return { ok: true, data: (data ?? {}) as T }
  }

  
  let errJson: { error?: { code?: string } } | null = null
  try {
    errJson = (await res.json()) as { error?: { code?: string } }
  } catch {
    
  }
  return { ok: false, code: errJson?.error?.code, status: res.status }
}


export function hubAuthUrl(
  licenseKey: string,
  returnUrl: string,
  deps: HubConnectDeps = {},
): Promise<HubConnectResult<{ url: string }>> {
  const hubUrl = deps.hubUrl ?? getHubUrl()
  const fetchImpl = deps.fetch ?? globalThis.fetch
  return postHubConnect(hubUrl, 'auth-url', { license_key: licenseKey, return_url: returnUrl }, fetchImpl)
}


export function hubAccounts(
  licenseKey: string,
  deps: HubConnectDeps = {},
): Promise<HubConnectResult<{ accounts: Array<{ id: string; resourceName: string }> }>> {
  const hubUrl = deps.hubUrl ?? getHubUrl()
  const fetchImpl = deps.fetch ?? globalThis.fetch
  return postHubConnect(hubUrl, 'accounts', { license_key: licenseKey }, fetchImpl)
}


export function hubSelect(
  licenseKey: string,
  customerId: string,
  loginCustomerId: string | undefined,
  deps: HubConnectDeps = {},
): Promise<HubConnectResult<{ ok: true; customer_id: string }>> {
  const hubUrl = deps.hubUrl ?? getHubUrl()
  const fetchImpl = deps.fetch ?? globalThis.fetch
  return postHubConnect(
    hubUrl,
    'select',
    {
      license_key: licenseKey,
      customer_id: customerId,
      ...(loginCustomerId ? { login_customer_id: loginCustomerId } : {}),
    },
    fetchImpl,
  )
}


export function hubDisconnect(
  licenseKey: string,
  deps: HubConnectDeps = {},
): Promise<HubConnectResult<{ ok: true }>> {
  const hubUrl = deps.hubUrl ?? getHubUrl()
  const fetchImpl = deps.fetch ?? globalThis.fetch
  return postHubConnect(hubUrl, 'disconnect', { license_key: licenseKey }, fetchImpl)
}
