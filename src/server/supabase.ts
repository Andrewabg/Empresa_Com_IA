
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { conexaoSupabaseDoAmbiente, valorUtil } from '@/lib/env-supabase'


export type NextCookieStore = {
  getAll(): Array<{ name: string; value: string }>
  set(name: string, value: string, options?: CookieOptions): void
}


export function nextCookieAdapter(cookieStore: NextCookieStore) {
  return {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(
      cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>,
    ) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      } catch {
        
        
        
      }
    },
  }
}


let _serverDb: SupabaseClient | null = null


export function serverDb(): SupabaseClient {
  if (_serverDb) return _serverDb
  const url = conexaoSupabaseDoAmbiente().url
  const key = valorUtil(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!url || !key) {
    throw new Error('[serverDb] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  _serverDb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _serverDb
}


export function ssrClient(cookieStore: NextCookieStore) {
  
  
  const { url, anonKey } = conexaoSupabaseDoAmbiente()
  if (!url) {
    throw new Error('[ssrClient] SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) é obrigatória')
  }
  if (!anonKey) {
    throw new Error('[ssrClient] SUPABASE_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) é obrigatória')
  }
  return createServerClient(url, anonKey, {
    cookies: nextCookieAdapter(cookieStore),
    
    
    
    cookieOptions: { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
  })
}
