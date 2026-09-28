
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listLatestSnapshots } from '@/data/trafego'
import { conjuntosParaLancamento } from '@/lib/design/conjuntosParaLancamento'

export async function GET() {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  try {
    const snaps = await listLatestSnapshots(auth.id, 'adset', 200)
    return NextResponse.json({ conjuntos: conjuntosParaLancamento(snaps) })
  } catch (err) {
    console.error('[GET /api/design/conjuntos]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
