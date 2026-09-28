import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperator } from '@/server/auth/session'
import { getAgentRow, updateAgent } from '@/data/agents'
import { mergeCustomToolsPatch } from '@/lib/agent-custom-tools'
import { invalidateAgentCache } from '@/server/agent/jarvis'
import { getCustomTools } from '@/server/custom/registryTools'
import { ehAgenteDeCanal } from '@/server/canais/ehAgenteDeCanal'





export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireOperator(await cookies())
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  const body = await request.json().catch(() => null)
  if (body === null || typeof body !== 'object') return NextResponse.json({ error: 'body inválido' }, { status: 400 })

  
  
  let idsValidos: string[]
  try {
    idsValidos = getCustomTools().map((t) => t.id)
  } catch (err) {
    console.error('[PATCH /api/agents/:id/custom-tools] registro custom inválido:', err)
    return NextResponse.json({ error: 'registro custom inválido — corrija custom/tools/index.ts' }, { status: 503 })
  }

  const existing = await getAgentRow(id)
  if (!existing) return NextResponse.json({ error: 'agente não existe' }, { status: 404 })

  
  if (await ehAgenteDeCanal(id)) {
    return NextResponse.json({ error: 'Edite este atendente no Treino.', redirect: 'draft' }, { status: 409 })
  }

  const r = mergeCustomToolsPatch(existing.tools, body, idsValidos)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 })

  try {
    const row = await updateAgent(id, { tools: r.tools })
    invalidateAgentCache() 
    return NextResponse.json({ ok: true, tools: row.tools })
  } catch (err) {
    console.error('[PATCH /api/agents/:id/custom-tools]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
