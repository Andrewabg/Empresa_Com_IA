
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { buscarMetricas } from '@/server/tools/trafego/buscarMetricas'
import {
  listBlocos,
  listLatestSnapshots,
  upsertBloco,
} from '@/data/trafego'
import { checkToolkitConnections } from '@/server/config/connections'
import { getSetting } from '@/data/settings'
import { throttleAtivo, THROTTLE_SETTING_KEY } from '@/lib/trafego/graph/throttle'

const AGENT_ID = 'gestor-trafego'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  
  let preset: string | undefined
  try {
    const body = (await request.json().catch(() => ({}))) as { preset?: unknown }
    if (typeof body.preset === 'string' && body.preset.trim()) preset = body.preset.trim()
  } catch {
    
  }

  
  try {
    const report = await checkToolkitConnections()
    const meta = report.toolkits.find((t) => t.slug === 'metaads')
    if (!report.configured || !meta?.connected) {
      return NextResponse.json({ ok: false, reason: 'not_connected' as const })
    }
  } catch (err) {
    console.warn('[POST /api/trafego/atualizar] checkToolkitConnections falhou (fail-open):', err)
    
  }

  try {
    
    
    
    const th = throttleAtivo(await getSetting(THROTTLE_SETTING_KEY).catch(() => null), new Date().toISOString())
    if (th.ativo) return NextResponse.json({ ok: false, reason: 'throttled' as const, minutos: th.minutosRestantes })

    
    
    await buscarMetricas(
      { nivel: 'account', ...(preset ? { periodo: { preset } } : {}) },
      { operatorId: auth.id, actingAgentId: AGENT_ID },
    )

    
    const snaps = await listLatestSnapshots(auth.id, 'account', 1)
    const fresh = snaps[0]
    if (!fresh) {
      
      return NextResponse.json({ ok: false, reason: 'no_data' as const })
    }

    
    
    
    const accountSnapshotIds = new Set(
      (await listLatestSnapshots(auth.id, 'account', 200)).map((s) => s.id),
    )
    const blocos = await listBlocos(auth.id, AGENT_ID)
    for (const b of blocos) {
      if (b.snapshot_id && b.snapshot_id !== fresh.id && accountSnapshotIds.has(b.snapshot_id)) {
        try {
          await upsertBloco({
            id: b.id,
            operator_id: auth.id,
            type: b.type,
            snapshot_id: fresh.id,
          })
        } catch (e) {
          console.warn('[atualizar] re-pin de bloco falhou (não-fatal):', e)
        }
      }
    }

    return NextResponse.json({ ok: true, snapshotId: fresh.id })
  } catch (err) {
    console.error('[POST /api/trafego/atualizar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
