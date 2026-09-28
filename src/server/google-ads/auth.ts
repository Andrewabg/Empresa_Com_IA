



import { oauthTokenUrl } from './version'


export type AccessTokenProvider = () => Promise<string>


export interface CredsRefresh {
  clientId: string
  clientSecret: string
  refreshToken: string
}


export interface DepsAuth {
  
  fetch: typeof fetch
  
  agora: () => number
}


interface CacheToken {
  token: string
  
  expiraEm: number
}


export function criarLocalRefreshProvider(
  creds: CredsRefresh,
  deps: DepsAuth = { fetch: globalThis.fetch, agora: () => Date.now() },
): AccessTokenProvider {
  let cache: CacheToken | null = null

  return async function obterAccessToken(): Promise<string> {
    
    if (cache && deps.agora() < cache.expiraEm) {
      return cache.token
    }

    
    const body = new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    })

    const resposta = await deps.fetch(oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const json = await resposta.json() as Record<string, unknown>

    if (!resposta.ok || !json['access_token']) {
      
      throw new Error(
        `[GoogleAds] Falha ao obter access token (HTTP ${resposta.status}): ` +
        `${json['error'] ?? 'erro_desconhecido'} — ${json['error_description'] ?? ''}`.trim(),
      )
    }

    const token = json['access_token'] as string
    const expiresIn = typeof json['expires_in'] === 'number' ? json['expires_in'] : 3600
    
    const FOLGA_MS = 60_000
    cache = { token, expiraEm: deps.agora() + (expiresIn * 1000 - FOLGA_MS) }

    return token
  }
}





