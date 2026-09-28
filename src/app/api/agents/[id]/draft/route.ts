import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { guardCanalDraft } from '@/server/canais/draftGuard'
import { validarDelta } from '@/server/canais/validarDelta'
import { getDraft } from '@/data/agentConfigDrafts'
import { salvarDelta } from '@/server/canais/rascunho'
import { readLiveSnapshot } from '@/server/canais/channelConfig'
import { listBaseByAgent } from '@/data/baseConhecimento'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const guard = await guardCanalDraft(await cookies(), id)
  if (!guard.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: guard.status })

  try {
    const draft = await getDraft(id)
    
    
    
    const baseSnapshot = draft?.base_snapshot ?? (await readLiveSnapshot(id))
    
    
    let base: Awaited<ReturnType<typeof listBaseByAgent>> = []
    try { base = await listBaseByAgent(id) } catch (e) { console.error('[GET /api/agents/:id/draft] base', e) }
    return NextResponse.json({
      temRascunho: !!draft,
      delta: draft?.delta ?? null,
      baseSnapshot,
      base,
    })
  } catch (err) {
    console.error('[GET /api/agents/:id/draft]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const guard = await guardCanalDraft(await cookies(), id)
  if (!guard.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: guard.status })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = validarDelta(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    await salvarDelta(id, parsed.delta, guard.userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/agents/:id/draft]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
