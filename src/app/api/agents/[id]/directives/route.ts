
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperator } from '@/server/auth/session'
import { getAgentRow } from '@/data/agents'
import { getDirectives, upsertDirectives } from '@/data/agentDirectives'
import { listEpisodicByAgent } from '@/data/episodicMemory'
import { consolidarDiretrizes, DIRETRIZES_CAP, type Diretriz } from '@/lib/directives'
import { serverDb } from '@/server/supabase'
import { invalidateAgentCache } from '@/server/agent/jarvis'
import { ehAgenteDeCanal } from '@/server/canais/ehAgenteDeCanal'

const CAP = DIRETRIZES_CAP

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireOperator(await cookies()) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { id } = await ctx.params
  try {
    
    
    
    const [agentRow, dir, aprendizados] = await Promise.all([
      getAgentRow(id),
      getDirectives(id),
      listEpisodicByAgent(serverDb(), id, 10),
    ])
    if (!agentRow) return NextResponse.json({ error: 'agente não existe' }, { status: 404 })
    return NextResponse.json({
      diretrizes: dir.diretrizes,
      aprendizados: aprendizados.map((a) => ({ id: a.id, summary: a.summary, created_at: a.created_at })),
    })
  } catch (err) {
    console.error('[GET /api/agents/:id/directives]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireOperator(await cookies()) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { id } = await ctx.params
  if (!(await getAgentRow(id))) return NextResponse.json({ error: 'agente não existe' }, { status: 404 })
  
  
  if (await ehAgenteDeCanal(id)) {
    return NextResponse.json({ error: 'Edite este atendente no Treino.', redirect: 'draft' }, { status: 409 })
  }
  const body = (await req.json().catch(() => null)) as { diretrizes?: unknown } | null
  if (!body || !Array.isArray(body.diretrizes)) {
    return NextResponse.json({ error: 'diretrizes deve ser um array' }, { status: 400 })
  }
  
  
  
  
  
  
  
  
  const raw: Diretriz[] = []
  for (const it of body.diretrizes) {
    if (!it || typeof (it as { texto?: unknown }).texto !== 'string') {
      return NextResponse.json({ error: 'diretriz inválida' }, { status: 400 })
    }
    const d = it as { texto: string; origem?: unknown; at?: unknown; substitui?: unknown }
    const substitui = typeof d.substitui === 'string' && d.substitui.trim() ? d.substitui : undefined
    raw.push({
      texto: d.texto,
      origem: d.origem === 'reflector' ? 'reflector' : 'operador',
      at: typeof d.at === 'string' ? d.at : new Date().toISOString(),
      ...(substitui ? { substitui } : {}),
    })
  }
  try {
    await upsertDirectives(id, consolidarDiretrizes(raw, CAP))
    invalidateAgentCache() 
    const { diretrizes } = await getDirectives(id)
    return NextResponse.json({ ok: true, diretrizes })
  } catch (err) {
    console.error('[PUT /api/agents/:id/directives]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
