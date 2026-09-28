
import { cookies } from 'next/headers'
import { ssrClient } from '@/server/supabase'
import { mesmaOrigem } from '@/server/auth/mesmaOrigem'

export async function POST(request: Request) {
  if (!mesmaOrigem(request)) {
    return Response.json({ error: 'origem inválida' }, { status: 403 })
  }
  const cookieStore = await cookies()
  try {
    await ssrClient(cookieStore).auth.signOut()
  } catch (err) {
    
    console.warn('[auth/logout] signOut falhou (os cookies são limpos assim mesmo):', err instanceof Error ? err.name : 'erro')
  }
  return Response.json({ ok: true })
}
