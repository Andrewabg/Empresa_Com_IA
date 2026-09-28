
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getDefaultBrand } from '@/data/brands'
import { listCampanhas, toCampanhaView } from '@/data/campanhas'

export async function GET(_request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  try {
    const brand = await getDefaultBrand(auth.id)
    if (!brand) return NextResponse.json({ ok: true, campanhas: [] })
    const rows = await listCampanhas(auth.id, brand.id)
    return NextResponse.json({ ok: true, campanhas: rows.map(toCampanhaView) })
  } catch (err) {
    console.error('[GET /api/estudio/campanhas]', err)
    return NextResponse.json({ ok: true, campanhas: [] })
  }
}
