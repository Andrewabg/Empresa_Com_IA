import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { guardCanalDraft } from '@/server/canais/draftGuard'
import { simular } from '@/server/canais/simular'

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const guard = await guardCanalDraft(await cookies(), id)
  if (!guard.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: guard.status })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'body deve ser um objeto' }, { status: 400 })
  }
  const b = body as Record<string, unknown>

  const { mensagens, origem } = b
  if (!Array.isArray(mensagens)) {
    return NextResponse.json({ error: 'mensagens deve ser um array' }, { status: 400 })
  }
  for (const m of mensagens) {
    if (
      !m || typeof m !== 'object' || Array.isArray(m) ||
      !('role' in m) || !('content' in m) ||
      !['user', 'assistant'].includes((m as Record<string, unknown>).role as string) ||
      typeof (m as Record<string, unknown>).content !== 'string'
    ) {
      return NextResponse.json(
        { error: "mensagens deve ser array de {role:'user'|'assistant', content:string}" },
        { status: 400 },
      )
    }
  }
  if (origem !== undefined && origem !== 'rascunho' && origem !== 'publicado') {
    return NextResponse.json({ error: "origem deve ser 'rascunho' ou 'publicado'" }, { status: 400 })
  }

  try {
    const result = await simular(
      id,
      mensagens as Array<{ role: 'user' | 'assistant'; content: string }>,
      { origem: origem as 'rascunho' | 'publicado' | undefined },
    )
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/agents/:id/draft/simular]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
