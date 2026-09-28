





import { getSecret } from '@/server/secrets'
import {
  criarLocalRefreshProvider,
  type AccessTokenProvider,
  type CredsRefresh,
} from './auth'
import { mapearErroGoogleAds, type EstadoConexao } from './errors'
import {
  extrairCustomerIds,
  parseSearchStreamCampanhas,
  parseSearchStreamSearchTerms,
  type CampanhaRow,
} from './parse'
import type { SearchTermRow } from '@/lib/google-ads/types'
import { endpointListCustomers, endpointSearchStream } from './version'




export interface CredsGoogleAds extends CredsRefresh {
  developerToken: string
  customerId: string
  
  loginCustomerId?: string
}


export async function lerCredenciais(): Promise<CredsGoogleAds | null> {
  const [devToken, clientId, clientSecret, refreshToken, customerId, loginCustomerId] =
    await Promise.all([
      getSecret('google_ads_developer_token'),
      getSecret('google_ads_client_id'),
      getSecret('google_ads_client_secret'),
      getSecret('google_ads_refresh_token'),
      getSecret('google_ads_customer_id'),
      getSecret('google_ads_login_customer_id'), 
    ])

  if (!devToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return null
  }

  return {
    developerToken: devToken,
    clientId,
    clientSecret,
    refreshToken,
    customerId,
    
    ...(loginCustomerId ? { loginCustomerId: loginCustomerId.replace(/-/g, '') } : {}),
  }
}



export type ResultadoCampanhas = {
  estado: 'conectado'
  linhas: CampanhaRow[]
} | {
  estado: Exclude<EstadoConexao, 'conectado'>
  linhas: []
}

export type ResultadoSearchTerms = {
  estado: 'conectado'
  linhas: SearchTermRow[]
} | {
  estado: Exclude<EstadoConexao, 'conectado'>
  linhas: []
}



export interface DepsCliente {
  
  fetch?: typeof fetch
  
  agora?: () => number
}



export interface ClienteGoogleAds {
  
  searchStream(gaql: string, customerId?: string): Promise<ResultadoCampanhas>

  
  searchStreamTerms(gaql: string, customerId?: string): Promise<ResultadoSearchTerms>

  
  searchStreamRaw(gaql: string, customerId?: string): Promise<{ estado: EstadoConexao; batches: unknown }>

  
  listAccessibleCustomers(): Promise<string[]>

  
  discoverCustomerId(): Promise<string | null>

  
  verificarAcesso(): Promise<EstadoConexao>
}


export function criarClienteGoogleAds(
  creds: CredsGoogleAds,
  deps: DepsCliente = {},
): ClienteGoogleAds {
  const fetchImpl = deps.fetch ?? globalThis.fetch
  const agoraImpl = deps.agora ?? (() => Date.now())

  const provider: AccessTokenProvider = criarLocalRefreshProvider(
    {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken: creds.refreshToken,
    },
    { fetch: fetchImpl, agora: agoraImpl },
  )

  
  async function headersBase(): Promise<Record<string, string>> {
    const token = await provider()
    return {
      Authorization: `Bearer ${token}`,
      'developer-token': creds.developerToken,
    }
  }

  async function searchStream(gaql: string, customerId?: string): Promise<ResultadoCampanhas> {
    const cidAlvo = customerId ?? creds.customerId
    const headers = await headersBase()

    
    
    
    if (creds.loginCustomerId) {
      headers['login-customer-id'] = creds.loginCustomerId.replace(/-/g, '')
    }

    const resposta = await fetchImpl(endpointSearchStream(cidAlvo), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gaql }),
    })

    if (resposta.ok) {
      const batches = await resposta.json() as unknown
      const linhas = parseSearchStreamCampanhas(batches)
      return { estado: 'conectado', linhas }
    }

    
    const corpoJson = await resposta.json().catch(() => ({})) as unknown
    const resultado = mapearErroGoogleAds(resposta.status, corpoJson)
    return { estado: resultado.estado as Exclude<EstadoConexao, 'conectado'>, linhas: [] }
  }

  async function searchStreamTerms(gaql: string, customerId?: string): Promise<ResultadoSearchTerms> {
    const cidAlvo = customerId ?? creds.customerId
    const headers = await headersBase()

    
    if (creds.loginCustomerId) {
      headers['login-customer-id'] = creds.loginCustomerId.replace(/-/g, '')
    }

    const resposta = await fetchImpl(endpointSearchStream(cidAlvo), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gaql }),
    })

    if (resposta.ok) {
      const batches = await resposta.json() as unknown
      const linhas = parseSearchStreamSearchTerms(batches)
      return { estado: 'conectado', linhas }
    }

    const corpoJson = await resposta.json().catch(() => ({})) as unknown
    const resultado = mapearErroGoogleAds(resposta.status, corpoJson)
    return { estado: resultado.estado as Exclude<EstadoConexao, 'conectado'>, linhas: [] }
  }

  async function searchStreamRaw(gaql: string, customerId?: string): Promise<{ estado: EstadoConexao; batches: unknown }> {
    const cidAlvo = customerId ?? creds.customerId
    const headers = await headersBase()
    if (creds.loginCustomerId) {
      headers['login-customer-id'] = creds.loginCustomerId.replace(/-/g, '')
    }
    const resposta = await fetchImpl(endpointSearchStream(cidAlvo), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gaql }),
    })
    if (resposta.ok) {
      const batches = await resposta.json() as unknown
      return { estado: 'conectado', batches }
    }
    const corpoJson = await resposta.json().catch(() => ({})) as unknown
    const resultado = mapearErroGoogleAds(resposta.status, corpoJson)
    return { estado: resultado.estado, batches: [] }
  }

  async function listAccessibleCustomers(): Promise<string[]> {
    const headers = await headersBase()
    
    

    try {
      const resposta = await fetchImpl(endpointListCustomers(), { headers })
      if (!resposta.ok) return []
      const corpo = await resposta.json() as unknown
      return extrairCustomerIds(corpo)
    } catch {
      return []
    }
  }

  async function discoverCustomerId(): Promise<string | null> {
    const ids = await listAccessibleCustomers()
    
    
    if (ids.length === 1) return ids[0]
    return null
  }

  async function verificarAcesso(): Promise<EstadoConexao> {
    
    
    try {
      const headers = await headersBase()
      
      const resposta = await fetchImpl(endpointListCustomers(), { headers })

      if (resposta.ok) {
        
        return 'conectado'
      }

      
      const corpoJson = await resposta.json().catch(() => ({})) as unknown
      const resultado = mapearErroGoogleAds(resposta.status, corpoJson)
      return resultado.estado as Exclude<EstadoConexao, 'conectado'>
    } catch {
      return 'erro_desconhecido'
    }
  }

  return { searchStream, searchStreamTerms, searchStreamRaw, listAccessibleCustomers, discoverCustomerId, verificarAcesso }
}
