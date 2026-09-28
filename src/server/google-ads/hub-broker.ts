







import type { EstadoConexao } from './errors'
import { parseSearchStreamCampanhas, parseSearchStreamSearchTerms } from './parse'
import type { ClienteGoogleAds, ResultadoCampanhas, ResultadoSearchTerms } from './client'


const TIMEOUT_MS = 20_000


export function mapearErroHubBroker(code: string | undefined, status: number): EstadoConexao {
  void status 
  switch (code) {
    case 'NOT_CONNECTED':
      return 'nao_conectado'
    case 'NOT_ENTITLED':
    case 'INVALID_LICENSE':
      return 'nao_autorizado'
    default:
      return 'erro_desconhecido'
  }
}


type PostHubResult =
  | { ok: true; data: any }
  | { ok: false; code: string | undefined; status: number }


export function criarClienteHubBroker(
  cfg: { hubUrl: string; licenseKey: string; customerId: string },
  deps: { fetch?: typeof fetch } = {},
): ClienteGoogleAds {
  const fetchImpl = deps.fetch ?? globalThis.fetch

  
  async function postHub(
    path: 'search' | 'accounts',
    body: Record<string, unknown>,
  ): Promise<PostHubResult> {
    const url = `${cfg.hubUrl.replace(/\/+$/, '')}/api/hub/google-ads/${path}`
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
      let json: any
      try {
        json = await res.json()
      } catch {
        return { ok: false, code: 'BAD_RESPONSE', status: res.status }
      }
      return { ok: true, data: json?.data ?? {} }
    }

    
    let errJson: any = null
    try {
      errJson = await res.json()
    } catch {
      
    }
    return { ok: false, code: errJson?.error?.code, status: res.status }
  }

  async function searchStream(gaql: string, customerId?: string): Promise<ResultadoCampanhas> {
    const r = await postHub('search', {
      license_key: cfg.licenseKey,
      customer_id: customerId ?? cfg.customerId,
      query: gaql,
    })
    if (r.ok) {
      return { estado: 'conectado', linhas: parseSearchStreamCampanhas(r.data.batches) }
    }
    return { estado: mapearErroHubBroker(r.code, r.status), linhas: [] }
  }

  async function searchStreamTerms(gaql: string, customerId?: string): Promise<ResultadoSearchTerms> {
    const r = await postHub('search', {
      license_key: cfg.licenseKey,
      customer_id: customerId ?? cfg.customerId,
      query: gaql,
    })
    if (r.ok) {
      return { estado: 'conectado', linhas: parseSearchStreamSearchTerms(r.data.batches) }
    }
    return { estado: mapearErroHubBroker(r.code, r.status), linhas: [] }
  }

  async function searchStreamRaw(
    gaql: string,
    customerId?: string,
  ): Promise<{ estado: EstadoConexao; batches: unknown }> {
    const r = await postHub('search', {
      license_key: cfg.licenseKey,
      customer_id: customerId ?? cfg.customerId,
      query: gaql,
    })
    if (r.ok) {
      return { estado: 'conectado', batches: r.data.batches ?? [] }
    }
    return { estado: mapearErroHubBroker(r.code, r.status), batches: [] }
  }

  async function listAccessibleCustomers(): Promise<string[]> {
    const r = await postHub('accounts', { license_key: cfg.licenseKey })
    if (!r.ok) return []
    const accounts = (r.data.accounts ?? []) as Array<{ id: string }>
    return accounts
      .map((a) => a.id)
      .filter((x): x is string => typeof x === 'string')
  }

  async function discoverCustomerId(): Promise<string | null> {
    const ids = await listAccessibleCustomers()
    
    return ids.length === 1 ? ids[0] : null
  }

  async function verificarAcesso(): Promise<EstadoConexao> {
    const r = await postHub('accounts', { license_key: cfg.licenseKey })
    if (r.ok) return 'conectado'
    return mapearErroHubBroker(r.code, r.status)
  }

  return {
    searchStream,
    searchStreamTerms,
    searchStreamRaw,
    listAccessibleCustomers,
    discoverCustomerId,
    verificarAcesso,
  }
}
