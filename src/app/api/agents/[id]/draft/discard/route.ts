import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { guardCanalDraft } from '@/server/canais/draftGuard'
import { descartar } from '@/server/canais/rascunho'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const guard = await guardCanalDraft(await cookies(), id)
  if (!guard.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: guard.status })

  try {
    await descartar(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/agents/:id/draft/discard]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
