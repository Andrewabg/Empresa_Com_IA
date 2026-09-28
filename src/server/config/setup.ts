

import { serverDb } from '@/server/supabase'
import { publicBaseUrl, baseUrlDaRequisicao } from '@/lib/public-url'


export async function isConfigured(): Promise<boolean> {
  const { data, error } = await serverDb().rpc('is_configured')
  if (error) {
    console.error('[isConfigured] RPC error:', error.message)
    return false
  }
  return data === true
}


export function webhookUrl(request?: Request): string {
  const base = request ? baseUrlDaRequisicao(request) : publicBaseUrl()
  return `${base}/api/github/webhook`
}
