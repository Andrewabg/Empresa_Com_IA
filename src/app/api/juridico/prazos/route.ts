
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getMembro } from '@/server/auth/membro'
import { listPrazos, listPrazosAtivos } from '@/data/prazos'
import { toPrazoView } from '@/lib/juridico/prazosTipos'

export async function GET() {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    
    let ehDono = false
    try { ehDono = (await getMembro(cookieStore))?.papel === 'dono' } catch (err) {
      console.warn('[GET /api/juridico/prazos] leitura do papel falhou (fica no escopo do operador):', err)
    }
    const rows = ehDono ? await listPrazosAtivos() : await listPrazos(auth.id, { status: 'ativo' })
    const prazos = rows.map(toPrazoView)
    return NextResponse.json({ ok: true, prazos })
  } catch (err) {
    console.error('[GET /api/juridico/prazos]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
