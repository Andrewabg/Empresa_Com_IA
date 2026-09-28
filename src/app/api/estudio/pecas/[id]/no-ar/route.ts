


import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { setPecaNoAr, clearPecaNoAr, getPecaComVersoes, toPecaView } from '@/data/pecas'
import { lerPerfDaPeca, montarPerfDeMetricas, type MetricasAd } from '@/server/tools/estudio/perfDaPeca'
import { deveAprender } from '@/lib/estudio/adPerf'
import { enqueueMemoryJob } from '@/data/memoryJobs'


function coerceMetricas(raw: unknown): MetricasAd | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
  const m: MetricasAd = { roas: num(r.roas), ctr: num(r.ctr), spend: num(r.spend), nome: typeof r.nome === 'string' ? r.nome : undefined }
  
  return m.roas !== undefined || m.ctr !== undefined || m.spend !== undefined ? m : null
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params
  let body: { adId?: unknown; metricas?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const adId = body.adId
  if (typeof adId !== 'string' || !adId.trim()) return NextResponse.json({ error: 'adId obrigatório' }, { status: 400 })
  try {
    
    
    const metricas = coerceMetricas(body.metricas)
    const perf = metricas
      ? await montarPerfDeMetricas({ operatorId: auth.id, adId: adId.trim() }, metricas)
      : await lerPerfDaPeca({ operatorId: auth.id, adId: adId.trim() }) 
    await setPecaNoAr(id, auth.id, adId.trim(), perf)
    const full = await getPecaComVersoes(id)
    
    if (!full || full.operator_id !== auth.id) return NextResponse.json({ error: 'not found' }, { status: 404 })
    
    
    
    if (deveAprender(perf, full.aprendido_ad_id)) {
      try { await enqueueMemoryJob('reflect_peca', `${auth.id}:${id}`) } catch (e) { console.warn('[no-ar] enqueue reflect_peca (não-fatal):', e) }
    }
    return NextResponse.json({ ok: true, peca: toPecaView(full) })
  } catch (err) {
    console.error('[POST /api/estudio/pecas/:id/no-ar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params
  try {
    await clearPecaNoAr(id, auth.id)
    const full = await getPecaComVersoes(id)
    
    if (!full || full.operator_id !== auth.id) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ ok: true, peca: toPecaView(full) })
  } catch (err) {
    console.error('[DELETE /api/estudio/pecas/:id/no-ar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
