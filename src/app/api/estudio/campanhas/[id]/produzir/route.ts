
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { produzirCampanha } from '@/server/tools/estudio/produzirCampanha'

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  const { id } = await ctx.params
  try {
    const result = await produzirCampanha({ campanhaId: id, operatorId: auth.id })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[POST /api/estudio/campanhas/:id/produzir]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
