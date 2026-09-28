
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { gerarCriativo } from '@/server/tools/design/gerarCriativo'

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  try {
    const r = await gerarCriativo({ pecaId: id }, { operatorId: auth.id, actingAgentId: 'designer' })
    if (!r.patch || r.patch.entidade !== 'criativo') return NextResponse.json({ ok: false, error: r.output }, { status: 422 })
    return NextResponse.json({ ok: true, criativo: r.patch.criativo })
  } catch (err) {
    console.error('[POST /api/design/criativos/:id/gerar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
