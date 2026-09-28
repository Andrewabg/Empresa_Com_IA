
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { setBlocoStatus } from '@/data/trafego'

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  const { id } = await ctx.params

  let body: { status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const status = body.status
  if (status !== 'done' && status !== 'active') {
    return NextResponse.json({ error: "status deve ser 'done' ou 'active'" }, { status: 400 })
  }

  try {
    const row = await setBlocoStatus(id, auth.id, status)
    return NextResponse.json({ ok: true, bloco: row })
  } catch (err) {
    console.error('[PATCH /api/trafego/blocos/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
