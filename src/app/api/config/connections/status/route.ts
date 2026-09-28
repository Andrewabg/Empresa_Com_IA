
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getComposioClient } from '@/server/actions/composio'
import { invalidateConnectionsCache } from '@/server/config/connections'
import { invalidateActionsCache } from '@/server/actions/actions'
import { invalidateComposioToolsCache } from '@/server/actions/mastraTools'
import { invalidateAgentCache } from '@/server/agent/jarvis'

export async function GET(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'id obrigatório' }, { status: 400 })
  const c = await getComposioClient()
  if (!c) return Response.json({ error: 'composio não configurado' }, { status: 409 })
  try {
    const acc = await c.connectedAccounts.get(id) as { status?: unknown }
    const status = String(acc.status ?? '')
    if (status.toUpperCase() === 'ACTIVE') {
      invalidateActionsCache(); invalidateComposioToolsCache(); invalidateConnectionsCache(); invalidateAgentCache()
    }
    return Response.json({ status })
  } catch (err) {
    console.warn('[connections/status] falhou:', err instanceof Error ? err.message : err)
    return Response.json({ status: 'UNKNOWN' })
  }
}
