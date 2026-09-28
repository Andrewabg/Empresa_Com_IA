
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { checkToolkitConnections } from '@/server/config/connections'
import { montarDrillCampanha } from '@/server/tools/trafego/montarDrillCampanha'

const AGENT_ID = 'gestor-trafego'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  
  
  let campaignId = ''
  let preset: string | undefined
  try {
    const body = (await request.json().catch(() => ({}))) as { campaignId?: unknown; preset?: unknown }
    if (typeof body.campaignId === 'string') campaignId = body.campaignId.trim()
    if (typeof body.preset === 'string' && body.preset.trim()) preset = body.preset.trim()
  } catch {
    
  }
  if (!campaignId) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

  
  try {
    const report = await checkToolkitConnections()
    const meta = report.toolkits.find((t) => t.slug === 'metaads')
    if (!report.configured || !meta?.connected) {
      return NextResponse.json({ ok: false, reason: 'not_connected' as const })
    }
  } catch (err) {
    console.warn('[POST /api/trafego/drill] checkToolkitConnections falhou (fail-open):', err)
    
  }

  try {
    const hojeISO = new Date().toISOString().slice(0, 10)
    const res = await montarDrillCampanha(
      { campaignId, ...(preset ? { periodo: { preset } } : {}) },
      { operatorId: auth.id, actingAgentId: AGENT_ID, hojeISO },
    )
    if (!res.ok) return NextResponse.json({ ok: false, reason: res.reason })
    return NextResponse.json({ ok: true, patch: res.patch })
  } catch (err) {
    console.error('[POST /api/trafego/drill]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
