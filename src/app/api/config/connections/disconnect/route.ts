
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getComposioClient, composioUserId } from '@/server/actions/composio'
import { invalidateConnectionsCache } from '@/server/config/connections'
import { invalidateMetaHealthCache } from '@/server/config/metaHealth'
import { invalidateActionsCache } from '@/server/actions/actions'
import { invalidateComposioToolsCache } from '@/server/actions/mastraTools'
import { invalidateAgentCache } from '@/server/agent/jarvis'


interface ConnectedAccountsApi {
  list(params: { userIds: string[] }): Promise<{ items?: Array<{ id?: string; toolkit?: { slug?: string } }> }>
  delete(id: string): Promise<unknown>
}

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  let body: { slug?: string }
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'JSON inválido' }, { status: 400 }) }
  const slug = body.slug
  if (!slug) return Response.json({ ok: false, error: 'slug obrigatório' }, { status: 400 })

  const c = await getComposioClient()
  if (!c) return Response.json({ ok: false, error: 'composio não configurado' }, { status: 409 })

  try {
    const cc = c.connectedAccounts as unknown as ConnectedAccountsApi
    const res = await cc.list({ userIds: [composioUserId()] })
    const ids = (res.items ?? [])
      .filter((a) => a.toolkit?.slug === slug && !!a.id)
      .map((a) => a.id as string)

    
    await Promise.allSettled(ids.map((id) => cc.delete(id)))

    
    invalidateActionsCache(); invalidateComposioToolsCache(); invalidateConnectionsCache(); invalidateAgentCache(); invalidateMetaHealthCache()
    return Response.json({ ok: true })
  } catch (err) {
    console.warn('[connections/disconnect] falhou ao desconectar:', err instanceof Error ? err.name : 'erro')
    return Response.json({ ok: false, error: 'Não consegui desconectar. Tente de novo.' }, { status: 502 })
  }
}
