
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getSwipe, deleteSwipe } from '@/data/swipes'

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  const { id } = await ctx.params
  try {
    const swipe = await getSwipe(id)
    if (!swipe || swipe.operator_id !== auth.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true, swipe })
  } catch (err) {
    console.error('[GET /api/estudio/swipes/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  const { id } = await ctx.params
  try {
    await deleteSwipe(id, auth.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/estudio/swipes/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
