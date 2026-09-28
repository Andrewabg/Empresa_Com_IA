
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { restaurarVersao } from '@/server/tools/estudio/restaurarVersao'
import { getPecaComVersoes } from '@/data/pecas'
import { toCriativoView } from '@/lib/design/types'

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  let body: { n?: unknown } = {}
  try { body = await request.json() } catch {  }
  if (typeof body.n !== 'number' || !Number.isInteger(body.n) || body.n < 1) {
    return NextResponse.json({ ok: false, error: 'Diga qual versão restaurar.' }, { status: 400 })
  }

  try {
    const r = await restaurarVersao({ pecaId: id, n: body.n }, { operatorId: auth.id })
    if (!r.ok || !r.versao) return NextResponse.json({ ok: false, error: r.output }, { status: 422 })
    const peca = await getPecaComVersoes(id)
    if (!peca) return NextResponse.json({ ok: false, error: r.output }, { status: 422 })
    return NextResponse.json({ ok: true, criativo: toCriativoView(peca, r.versao), aviso: r.output })
  } catch (err) {
    console.error('[POST /api/design/criativos/:id/restaurar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
