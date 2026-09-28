
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { setPecaStatus, type PecaStatus } from '@/data/pecas'

const STATUS_VALIDOS: readonly PecaStatus[] = ['brief', 'rascunho', 'revisao', 'aprovada', 'arquivada']

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
  if (typeof status !== 'string' || !STATUS_VALIDOS.includes(status as PecaStatus)) {
    return NextResponse.json(
      { error: `status deve ser um de ${STATUS_VALIDOS.join(', ')}` },
      { status: 400 },
    )
  }

  try {
    const peca = await setPecaStatus(id, auth.id, status as PecaStatus)
    return NextResponse.json({ ok: true, peca })
  } catch (err) {
    console.error('[PATCH /api/estudio/pecas/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
