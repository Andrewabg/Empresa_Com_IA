import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { guardCanalDraft } from '@/server/canais/draftGuard'
import { reverter } from '@/server/canais/rascunho'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const guard = await guardCanalDraft(await cookies(), id)
  if (!guard.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: guard.status })

  try {
    const result = await reverter(id, { publishedBy: guard.userId })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/agents/:id/draft/revert]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
