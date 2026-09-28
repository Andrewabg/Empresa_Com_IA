
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { mergePecaBrief } from '@/data/pecas'
import { toCriativoView } from '@/lib/design/types'

const CAMPOS = ['objetivo', 'publico', 'oferta', 'angulo', 'restricoes'] as const

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {  }

  const patch: Record<string, unknown> = {}
  for (const c of CAMPOS) if (typeof body[c] === 'string') patch[c] = body[c]
  if (typeof body.usarRosto === 'boolean') patch.usarRosto = body.usarRosto
  if (typeof body.referenciaId === 'string') patch.referenciaId = body.referenciaId
  const placement = typeof body.placement === 'string' ? body.placement : undefined

  try {
    const updated = await mergePecaBrief(id, auth.id, patch, placement)
    if (!updated) return NextResponse.json({ ok: false, error: 'Não achei esse criativo.' }, { status: 404 })
    return NextResponse.json({ ok: true, criativo: toCriativoView(updated, updated.versoes.at(-1)) })
  } catch (err) {
    console.error('[POST /api/design/criativos/:id/brief]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
