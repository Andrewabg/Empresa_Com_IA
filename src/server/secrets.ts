

import { serverDb } from '@/server/supabase'



export const SECRET_KEYS = {
  openai_api_key: 'openai_api_key',
  github_token: 'github_token',
  github_repo: 'github_repo',
  webhook_secret: 'webhook_secret',
  composio_api_key: 'composio_api_key',
  cron_secret: 'cron_secret',
  whatsapp_access_token: 'whatsapp_access_token',
  whatsapp_app_secret: 'whatsapp_app_secret',
  whatsapp_verify_token: 'whatsapp_verify_token',
  whatsapp_waba_id: 'whatsapp_waba_id',
  instagram_access_token: 'instagram_access_token',
  instagram_ig_user_id: 'instagram_ig_user_id',
  instagram_verify_token: 'instagram_verify_token',
  telegram_bot_token: 'telegram_bot_token',
  update_repo: 'update_repo',                     
  easypanel_deploy_webhook: 'easypanel_deploy_webhook', 
} as const

export type SecretKey = (typeof SECRET_KEYS)[keyof typeof SECRET_KEYS]


export const BYO_SECRET_KEYS = [
  SECRET_KEYS.openai_api_key,
  SECRET_KEYS.github_token,
  SECRET_KEYS.github_repo,
  SECRET_KEYS.composio_api_key,
  SECRET_KEYS.whatsapp_access_token,
  SECRET_KEYS.whatsapp_app_secret,
  SECRET_KEYS.whatsapp_verify_token,
  SECRET_KEYS.whatsapp_waba_id,
  SECRET_KEYS.instagram_access_token,
  SECRET_KEYS.instagram_ig_user_id,
  SECRET_KEYS.instagram_verify_token,
  SECRET_KEYS.telegram_bot_token,
  SECRET_KEYS.update_repo,
  SECRET_KEYS.easypanel_deploy_webhook,
] as const




export const UAZAPI_ADMIN_TOKEN = 'uazapi_admin_token' 
export const uazapiTokenKey = (canalId: string): string => `uazapi_token_${canalId}`
export const uazapiWebhookSecretKey = (canalId: string): string => `uazapi_webhook_secret_${canalId}`


export const fonteSecretKey = (fonteId: string): string => `fonte_${fonteId}`


const SECRET_TTL_MS = 60_000
const _secretCache = new Map<string, { value: string | null; expiresAt: number }>()


export function invalidateSecretsCache(name?: string): void {
  if (name) _secretCache.delete(name)
  else _secretCache.clear()
}


export async function setSecret(name: string, value: string): Promise<void> {
  const { error } = await serverDb().rpc('set_secret', {
    p_name: name,
    p_value: value,
  })
  if (error) {
    throw new Error(`[setSecret] Failed to store secret "${name}": ${error.message}`)
  }
  
  
  _secretCache.set(name, { value, expiresAt: Date.now() + SECRET_TTL_MS })
}


export async function deleteSecret(name: string): Promise<void> {
  const { error } = await serverDb().rpc('delete_secret', { p_name: name })
  if (error) throw new Error(`[deleteSecret] Failed to delete secret "${name}": ${error.message}`)
  _secretCache.delete(name)
}


export async function getSecret(name: string): Promise<string | null> {
  const cached = _secretCache.get(name)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const { data, error } = await serverDb().rpc('get_secret', { p_name: name })
  if (error) {
    throw new Error(`[getSecret] Failed to read secret "${name}": ${error.message}`)
  }
  
  const value = (data as string | null) ?? null
  _secretCache.set(name, { value, expiresAt: Date.now() + SECRET_TTL_MS })
  return value
}


export async function getConfigStatus(): Promise<Record<SecretKey, boolean>> {
  const [openai, github_token, github_repo, webhook, composio, cron,
         wa_token, wa_app_secret, wa_verify, wa_waba,
         ig_token, ig_user_id, ig_verify, tg_bot_token,
         upd_repo, ep_webhook] = await Promise.all([
    getSecret(SECRET_KEYS.openai_api_key),
    getSecret(SECRET_KEYS.github_token),
    getSecret(SECRET_KEYS.github_repo),
    getSecret(SECRET_KEYS.webhook_secret),
    getSecret(SECRET_KEYS.composio_api_key),
    getSecret(SECRET_KEYS.cron_secret),
    getSecret(SECRET_KEYS.whatsapp_access_token),
    getSecret(SECRET_KEYS.whatsapp_app_secret),
    getSecret(SECRET_KEYS.whatsapp_verify_token),
    getSecret(SECRET_KEYS.whatsapp_waba_id),
    getSecret(SECRET_KEYS.instagram_access_token),
    getSecret(SECRET_KEYS.instagram_ig_user_id),
    getSecret(SECRET_KEYS.instagram_verify_token),
    getSecret(SECRET_KEYS.telegram_bot_token),
    getSecret(SECRET_KEYS.update_repo),
    getSecret(SECRET_KEYS.easypanel_deploy_webhook),
  ])

  return {
    openai_api_key: !!openai,
    github_token: !!github_token,
    github_repo: !!github_repo,
    webhook_secret: !!webhook,
    composio_api_key: !!composio,
    cron_secret: !!cron,
    whatsapp_access_token: !!wa_token,
    whatsapp_app_secret: !!wa_app_secret,
    whatsapp_verify_token: !!wa_verify,
    whatsapp_waba_id: !!wa_waba,
    instagram_access_token: !!ig_token,
    instagram_ig_user_id: !!ig_user_id,
    instagram_verify_token: !!ig_verify,
    telegram_bot_token: !!tg_bot_token,
    update_repo: !!upd_repo,
    easypanel_deploy_webhook: !!ep_webhook,
  }
}
