







import { timingSafeEqual } from 'node:crypto'
import { getSecret, SECRET_KEYS, uazapiTokenKey, uazapiWebhookSecretKey } from '@/server/secrets'
import { getCanal, type CanalRow } from '@/data/canais'
import { verifySignature } from '@/server/webhook/verify'
import { whatsappCloudAdapter } from './providers/whatsappCloud'
import { uazapiAdapter } from './providers/uazapi'
import { instagramAdapter } from './providers/instagram'
import type { ProviderSlug, ProviderSpec, CanalCreds, CanalEvent, VerificacaoRequest } from './types'


interface VerificarRequestInput { rawBody: string; headers: Record<string, string>; pathSegments: string[] }



function timingSafeStr(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}


interface VerificarRequestDeps { getSecret?: typeof getSecret; getCanal?: typeof getCanal }
interface VerificarEventoDeps { getSecret?: typeof getSecret }
interface ResolverCredsDeps { getSecret?: typeof getSecret }








export const cloudSpec = {
  slug: 'whatsapp_cloud',
  adapter: whatsappCloudAdapter,

  
  
  
  async verificarRequest(input: VerificarRequestInput, deps: VerificarRequestDeps = {}): Promise<VerificacaoRequest> {
    const _getSecret = deps.getSecret ?? getSecret
    const appSecret = await _getSecret(SECRET_KEYS.whatsapp_app_secret)
    if (!appSecret) return { ok: false, status: 503 }
    const sig = input.headers['x-hub-signature-256']
    if (!verifySignature(input.rawBody, sig, appSecret)) return { ok: false, status: 401 }
    return { ok: true }
  },

  

  async resolverCreds(_canal: CanalRow, deps: ResolverCredsDeps = {}): Promise<CanalCreds> {
    const _getSecret = deps.getSecret ?? getSecret
    
    
    return {
      accessToken: (await _getSecret(SECRET_KEYS.whatsapp_access_token)) ?? '',
      wabaId: (await _getSecret(SECRET_KEYS.whatsapp_waba_id)) ?? '',
    }
  },
} satisfies ProviderSpec


export const uazapiSpec = {
  slug: 'uazapi',
  adapter: uazapiAdapter,

  
  
  
  async verificarRequest(input: VerificarRequestInput, deps: VerificarRequestDeps = {}): Promise<VerificacaoRequest> {
    const _getSecret = deps.getSecret ?? getSecret
    const _getCanal = deps.getCanal ?? getCanal
    const [canalId, segredo] = input.pathSegments
    if (!canalId || !segredo) return { ok: false, status: 401 }
    const esperado = await _getSecret(uazapiWebhookSecretKey(canalId))
    if (!esperado || !timingSafeStr(segredo, esperado)) return { ok: false, status: 401 }
    const canal = await _getCanal(canalId)
    if (!canal) return { ok: false, status: 401 }
    return { ok: true, canal }
  },

  
  
  
  
  async verificarEvento(ev: CanalEvent, canal: CanalRow, rawBody: string, deps: VerificarEventoDeps = {}): Promise<boolean> {
    const _getSecret = deps.getSecret ?? getSecret
    if (ev.canalExternalId !== canal.external_id) return false
    const esperado = await _getSecret(uazapiTokenKey(canal.id))
    if (!esperado) return false
    let token = ''
    try {
      const body = JSON.parse(rawBody) as { token?: unknown }
      if (typeof body.token === 'string') token = body.token
    } catch { return false }
    return timingSafeStr(token, esperado)
  },

  async resolverCreds(canal: CanalRow, deps: ResolverCredsDeps = {}): Promise<CanalCreds> {
    const _getSecret = deps.getSecret ?? getSecret
    return {
      serverUrl: String(canal.config.server_url ?? ''),
      instanceToken: (await _getSecret(uazapiTokenKey(canal.id))) ?? '',
    }
  },
} satisfies ProviderSpec






export const instagramSpec = {
  slug: 'instagram',
  adapter: instagramAdapter,

  async verificarRequest(input: VerificarRequestInput, deps: VerificarRequestDeps = {}): Promise<VerificacaoRequest> {
    const _getSecret = deps.getSecret ?? getSecret
    const appSecret =
      
      
      (await _getSecret('instagram_app_secret')) ??
      (await _getSecret(SECRET_KEYS.whatsapp_app_secret))
    if (!appSecret) return { ok: false, status: 503 }
    const sig = input.headers['x-hub-signature-256']
    if (!verifySignature(input.rawBody, sig, appSecret)) return { ok: false, status: 401 }
    return { ok: true }
  },

  

  async resolverCreds(_canal: CanalRow, deps: ResolverCredsDeps = {}): Promise<CanalCreds> {
    const _getSecret = deps.getSecret ?? getSecret
    
    
    return {
      accessToken: (await _getSecret(SECRET_KEYS.instagram_access_token)) ?? '',
      igUserId: (await _getSecret(SECRET_KEYS.instagram_ig_user_id)) ?? '',
    }
  },
} satisfies ProviderSpec


export const PROVIDER_SLUGS = ['whatsapp_cloud', 'uazapi', 'instagram'] as const satisfies readonly ProviderSlug[]


export type ProviderSlugDespachavel = (typeof PROVIDER_SLUGS)[number]


export const PROVIDERS: Record<ProviderSlugDespachavel, ProviderSpec> = {
  whatsapp_cloud: cloudSpec,
  uazapi: uazapiSpec,
  instagram: instagramSpec,
}

export function getProvider(slug: string): ProviderSpec | undefined {
  return (PROVIDERS as Record<string, ProviderSpec>)[slug]
}
