import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperator } from '@/server/auth/session'
import { getAgentRow, listAgents } from '@/data/agents'
import { getCargoCatalog } from '@/server/agent/store/cargoCatalog'
import { toCard } from '@/lib/marketing-store'

export async function GET() {
  try { await requireOperator(await cookies()) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  try {
    
    const seeds = await getCargoCatalog()
    const catalog = seeds.map(toCard)
    
    const installedChecks = await Promise.all(
      seeds.map(async (s) => {
        const row = await getAgentRow(s.id)
        return row && !row.dismissed_at ? s.id : null
      }),
    )
    const installed = installedChecks.filter((x): x is string => x !== null)
    const managers = (await listAgents())
      .filter((a) => a.enabled)
      .map((a) => ({ id: a.id, name: a.name, role: a.role }))
    return NextResponse.json({ catalog, installed, managers })
  } catch (err) {
    console.error('[GET /api/loja]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
