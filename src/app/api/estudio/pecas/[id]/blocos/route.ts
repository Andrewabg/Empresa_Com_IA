
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { ajustarCopy, COPY_AJUSTAR_COPY } from '@/server/tools/estudio/ajustarCopy'

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  let body: { variacao?: unknown; blocoId?: unknown; texto?: unknown } = {}
  try { body = await request.json() } catch {  }
  if (typeof body.variacao !== 'number' || typeof body.blocoId !== 'string' || typeof body.texto !== 'string') {
    return NextResponse.json({ ok: false, error: COPY_AJUSTAR_COPY.pedidoIncompleto }, { status: 400 })
  }

  try {
    const r = await ajustarCopy(
      { pecaId: id, variacao: body.variacao, blocoId: body.blocoId, texto: body.texto },
      { operatorId: auth.id },
    )
    if (!r.peca) return NextResponse.json({ ok: false, error: r.output }, { status: 422 })
    return NextResponse.json({ ok: true, peca: r.peca, versao: r.versao, aviso: r.output })
  } catch (err) {
    console.error('[POST /api/estudio/pecas/:id/blocos]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
