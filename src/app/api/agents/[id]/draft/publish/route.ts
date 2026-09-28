import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { guardCanalDraft } from '@/server/canais/draftGuard'
import { publicar } from '@/server/canais/rascunho'

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const guard = await guardCanalDraft(await cookies(), id)
  if (!guard.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: guard.status })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {  }

  const confirmar = !!body?.confirmar

  try {
    const result = await publicar(id, { confirmar, publishedBy: guard.userId })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/agents/:id/draft/publish]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
