
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listAgentsSummary } from '@/data/agents'
import { listCanais } from '@/data/canais'
import { activeCockpitHrefs } from '@/lib/cockpit'

export async function GET() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    const [agents, canais] = await Promise.all([listAgentsSummary(), listCanais()])
    const active = [...activeCockpitHrefs(agents, canais.some((c) => c.enabled))]
    return Response.json({ active })
  } catch (err) {
    console.error('[GET /api/nav/cockpits]', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
