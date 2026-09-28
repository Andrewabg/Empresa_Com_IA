
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { finalizarCriativo } from '@/server/tools/design/finalizarCriativo'

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  let body: { variacao?: unknown; ajustes?: unknown } = {}
  try { body = await request.json() } catch {  }

  try {
    const r = await finalizarCriativo(
      { pecaId: id, variacao: typeof body.variacao === 'number' ? body.variacao : undefined, ajustes: typeof body.ajustes === 'string' ? body.ajustes : undefined },
      { operatorId: auth.id, actingAgentId: 'designer' },
    )
    if (!r.patch || r.patch.entidade !== 'criativo') return NextResponse.json({ ok: false, error: r.output }, { status: 422 })
    return NextResponse.json({ ok: true, criativo: r.patch.criativo })
  } catch (err) {
    console.error('[POST /api/design/criativos/:id/finalizar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
