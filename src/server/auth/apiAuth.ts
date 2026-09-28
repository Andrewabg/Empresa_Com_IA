import type { User } from '@supabase/supabase-js'
import { requireOperator } from './session'
import { getMembro, type Membro } from './membro'
import type { NextCookieStore } from '../supabase'


export async function requireOperatorApi(
  cookieStore: NextCookieStore,
): Promise<User | Response> {
  try {
    return await requireOperator(cookieStore)
  } catch (err) {
    const digest = (err as { digest?: unknown })?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw err
  }
}


export async function requireDonoApi(cookieStore: NextCookieStore): Promise<Membro | Response> {
  const m = await getMembro(cookieStore)
  if (!m) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (m.papel !== 'dono') return Response.json({ error: 'Forbidden' }, { status: 403 })
  return m
}
