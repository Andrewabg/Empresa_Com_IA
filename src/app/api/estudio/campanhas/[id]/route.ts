
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getCampanha, deleteCampanha, toCampanhaView } from '@/data/campanhas'

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  const { id } = await ctx.params
  try {
    const camp = await getCampanha(id)
    if (!camp || camp.operator_id !== auth.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true, campanha: toCampanhaView(camp) })
  } catch (err) {
    console.error('[GET /api/estudio/campanhas/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  const { id } = await ctx.params
  try {
    await deleteCampanha(id, auth.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/estudio/campanhas/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
