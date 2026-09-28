
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { montarPacoteDoCarrossel } from '@/server/design/pacoteDoCarrossel'

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  try {
    const r = await montarPacoteDoCarrossel({ pecaId: id, operatorId: auth.id })
    if (!r.ok) return NextResponse.json({ ok: false, error: r.erro }, { status: 404 })
    return new NextResponse(new Uint8Array(r.zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${r.nome}"`,
        'Content-Length': String(r.zip.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/design/criativos/:id/pacote]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
