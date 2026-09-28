import { redirect } from 'next/navigation'
import { ssrClient, type NextCookieStore } from '@/server/supabase'
import type { User } from '@supabase/supabase-js'
import { claimsToOperator } from './claims'
import { papelDoUsuario } from '@/data/equipe'
import type { Papel } from '@/lib/equipe'

export type Membro = { user: User; papel: Papel }


export async function getMembro(cookies: NextCookieStore): Promise<Membro | null> {
  const supabase = ssrClient(cookies)
  try {
    const { data, error } = await supabase.auth.getClaims()
    if (!data?.claims) {
      if (error) console.error('[getMembro] getClaims error:', error.message)
      return null
    }
    const user = claimsToOperator(data.claims as Parameters<typeof claimsToOperator>[0])
    const papel = await papelDoUsuario(user.id)
    if (!papel) return null
    return { user, papel }
  } catch (e) {
    console.error('[getMembro] fail-closed → null:', e instanceof Error ? e.message : e)
    return null
  }
}


export async function requireMembro(cookies: NextCookieStore): Promise<Membro> {
  const m = await getMembro(cookies)
  if (!m) redirect('/login')
  return m
}


export async function requireDono(cookies: NextCookieStore): Promise<Membro> {
  const m = await requireMembro(cookies)
  if (m.papel !== 'dono') redirect('/')
  return m
}
