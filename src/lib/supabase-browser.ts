

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SCRIPT_CONEXAO_ID,
  desserializarConexao,
  primeiroValorUtil,
  type ConexaoSupabase,
} from './env-supabase'


export function conexaoDoDocumento(): ConexaoSupabase {
  if (typeof document === 'undefined') return {}
  return desserializarConexao(document.getElementById(SCRIPT_CONEXAO_ID)?.textContent)
}


export function conexaoDoBrowser(): ConexaoSupabase {
  const doDocumento = conexaoDoDocumento()
  return {
    url: primeiroValorUtil(doDocumento.url, process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: primeiroValorUtil(doDocumento.anonKey, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  }
}



let _browserClient: SupabaseClient | null = null


export function browserClient(): SupabaseClient {
  if (_browserClient) return _browserClient

  
  
  const { url, anonKey: key } = conexaoDoBrowser()
  if (!url || !key) {
    throw new Error(
      '[browserClient] conexão Supabase ausente (nem no documento, nem no build)',
    )
  }

  _browserClient = createBrowserClient(url, key)
  return _browserClient
}


export async function ensureRealtimeAuth(sb: SupabaseClient): Promise<void> {
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token
  if (token) await sb.realtime.setAuth(token)
}
