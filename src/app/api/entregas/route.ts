
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getDefaultBrand } from '@/data/brands'
import { listCampanhas, toCampanhaView } from '@/data/campanhas'
import { abrirEntrega } from '@/server/entregas/abrirEntrega'
import { normalizarPedido } from '@/lib/entrega/pedido'

export async function GET() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    const brand = await getDefaultBrand(auth.id)
    if (!brand) return NextResponse.json({ ok: true, campanhas: [] })
    const rows = await listCampanhas(auth.id, brand.id)
    return NextResponse.json({ ok: true, campanhas: rows.map(toCampanhaView) })
  } catch (err) {
    console.error('[GET /api/entregas]', err)
    return NextResponse.json({ ok: true, campanhas: [] })
  }
}

export async function POST(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  let body: unknown = null
  try { body = await request.json() } catch { body = null }
  const { pedido, cortouPeloTeto } = normalizarPedido(body)

  try {
    const r = await abrirEntrega({ pedido, operatorId: auth.id })
    return NextResponse.json({ ...r, cortouPeloTeto })
  } catch (err) {
    console.error('[POST /api/entregas]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
