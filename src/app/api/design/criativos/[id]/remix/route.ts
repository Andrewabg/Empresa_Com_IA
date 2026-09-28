
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { remixarCriativo } from '@/server/tools/design/remixarCriativo'


const MAX_PEDIDO = 600

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  let body: Record<string, unknown> = {}
  try { body = (await request.json()) as Record<string, unknown> } catch {  }

  const pedido = typeof body.pedido === 'string' ? body.pedido.slice(0, MAX_PEDIDO) : ''
  const variacao = typeof body.variacao === 'number' ? body.variacao : undefined

  try {
    const r = await remixarCriativo(
      { pecaId: id, pedido, ...(variacao !== undefined ? { variacao } : {}) },
      { operatorId: auth.id, actingAgentId: 'designer' },
    )
    
    if (!r.patch || r.patch.entidade !== 'criativo') {
      return NextResponse.json({ ok: false, error: r.output }, { status: 422 })
    }
    return NextResponse.json({ ok: true, criativo: r.patch.criativo, aviso: r.output })
  } catch (err) {
    console.error('[POST /api/design/criativos/:id/remix]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
