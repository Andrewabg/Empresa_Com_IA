
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getComposioClient, composioUserId } from '@/server/actions/composio'
import { planActivationFromToolkit, toolkitDisplayName, invalidateConnectionsCache, type ToolkitAuthMeta } from '@/server/config/connections'
import { invalidateActionsCache } from '@/server/actions/actions'
import { invalidateComposioToolsCache } from '@/server/actions/mastraTools'
import { invalidateAgentCache } from '@/server/agent/jarvis'
import { invalidateMetaHealthCache } from '@/server/config/metaHealth'
import { baseUrlDaRequisicao } from '@/lib/public-url'
import { reasonForActivateThrow } from '@/lib/connections/activation-outcome'
import { extrairFalhaComposio, reasonForComposioFailure } from '@/lib/connections/composio-fail'
import { safeReturnTo } from '@/lib/return-to'

const COMPOSIO_OAUTH_REDIRECT = 'https://backend.composio.dev/api/v3.1/toolkits/auth/callback'


interface AuthConfigsApi {
  list(params: { toolkit?: string }): Promise<{ items?: Array<{ id: string; authScheme?: string }> }>
  
  
  create(slug: string, opts: { name?: string; type: string; authScheme?: string; credentials?: Record<string, unknown> }): Promise<{ id: string }>
  delete(id: string): Promise<unknown>
}
interface ConnectedAccountsApi {
  
  
  
  initiate(userId: string, authConfigId: string, opts: { config?: { authScheme: string; val: Record<string, unknown> }; callbackUrl?: string }): Promise<{ id: string; redirectUrl?: string; status?: string }>
  link(userId: string, authConfigId: string, opts: { callbackUrl?: string; allowMultiple?: boolean }): Promise<{ id: string; redirectUrl?: string; status?: string }>
}


async function findOrCreateApiKeyAuthConfig(ac: AuthConfigsApi, slug: string): Promise<string> {
  const list = await ac.list({ toolkit: slug }).catch(() => ({ items: [] as Array<{ id: string; authScheme?: string }> }))
  const existing = (list.items ?? []).find((x) => (x.authScheme ?? '').toUpperCase() === 'API_KEY')
  if (existing) return existing.id
  
  
  
  const created = await ac.create(slug, { name: toolkitDisplayName(slug), type: 'use_custom_auth', authScheme: 'API_KEY', credentials: {} })
  return created.id
}


async function deleteApiKeyAuthConfigs(ac: AuthConfigsApi, slug: string): Promise<void> {
  const list = await ac.list({ toolkit: slug }).catch(() => ({ items: [] as Array<{ id: string; authScheme?: string }> }))
  for (const x of list.items ?? []) {
    if ((x.authScheme ?? '').toUpperCase() === 'API_KEY') await ac.delete(x.id).catch(() => {})
  }
}


async function findOrCreateManagedAuthConfig(ac: AuthConfigsApi, slug: string): Promise<string> {
  const list = await ac.list({ toolkit: slug }).catch(() => ({ items: [] as Array<{ id: string; authScheme?: string }> }))
  const existing = (list.items ?? [])[0]
  if (existing) return existing.id
  const created = await ac.create(slug, { type: 'use_composio_managed_auth', name: toolkitDisplayName(slug) })
  return created.id
}


function respondLink(req: { id?: string; redirectUrl?: string; status?: string }, mode: string): Response {
  if (!req?.redirectUrl || !req?.id) {
    console.warn('[connections/activate] link sem redirectUrl', { mode, status: req?.status, hasId: !!req?.id })
    return Response.json(
      { error: 'Não consegui iniciar a conexão. Verifique os dados e tente de novo.', reason: 'oauth_nao_iniciou' },
      { status: 502 },
    )
  }
  return Response.json({ redirectUrl: req.redirectUrl, connectionId: req.id })
}

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  let body: { slug?: string; credentials?: Record<string, string>; returnTo?: string }
  try { body = await request.json() } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }) }
  const slug = body.slug
  if (!slug) return Response.json({ error: 'slug obrigatório' }, { status: 400 })

  const c = await getComposioClient()
  if (!c) return Response.json({ error: 'composio não configurado', reason: 'nao_configurado' }, { status: 409 })

  
  
  
  
  
  const callbackUrl = `${baseUrlDaRequisicao(request)}${safeReturnTo(body.returnTo)}`
  const userId = composioUserId()

  let mode: string | undefined
  try {
    
    const tk = (await c.toolkits.get(slug)) as unknown as ToolkitAuthMeta
    const plan = planActivationFromToolkit(tk)
    mode = plan.mode
    const cc = c.connectedAccounts as unknown as ConnectedAccountsApi

    
    
    
    
    if (plan.mode === 'none') {
      return Response.json({ active: true, semConexao: true, status: 'ACTIVE' })
    }

    if (plan.mode === 'apikey') {
      const ac = c.authConfigs as unknown as AuthConfigsApi
      
      const val: Record<string, unknown> = { ...(body.credentials ?? {}) }
      const initiateApiKey = async () => {
        const authConfigId = await findOrCreateApiKeyAuthConfig(ac, slug)
        return cc.initiate(userId, authConfigId, { config: { authScheme: 'API_KEY', val } })
      }
      let req: { id: string; status?: string }
      try {
        req = await initiateApiKey()
      } catch (err) {
        
        
        
        if (err instanceof Error && /MultipleConnectedAccounts/i.test(err.name ?? '')) {
          await deleteApiKeyAuthConfigs(ac, slug)
          req = await initiateApiKey()
        } else {
          throw err
        }
      }
      
      invalidateActionsCache(); invalidateComposioToolsCache(); invalidateConnectionsCache(); invalidateAgentCache(); invalidateMetaHealthCache()
      return Response.json({ active: true, connectionId: req.id, status: req.status ?? 'ACTIVE' })
    }

    if (plan.mode === 'byo' && body.credentials && Object.keys(body.credentials).length) {
      const cfg = await c.authConfigs.create(slug, {
        name: toolkitDisplayName(slug), type: 'use_custom_auth', authScheme: 'OAUTH2',
        credentials: { ...body.credentials, oauth_redirect_uri: COMPOSIO_OAUTH_REDIRECT },
      })
      
      
      const req = await cc.link(userId, cfg.id, { callbackUrl, allowMultiple: true })
      return respondLink(req, 'byo')
    }

    
    
    
    const ac = c.authConfigs as unknown as AuthConfigsApi
    const authConfigId = await findOrCreateManagedAuthConfig(ac, slug)
    const req = await cc.link(userId, authConfigId, { callbackUrl, allowMultiple: true })
    return respondLink(req, 'managed')
  } catch (err) {
    
    
    const falha = extrairFalhaComposio(err)
    console.warn('[connections/activate] falhou ao iniciar a conexão:', err instanceof Error ? err.name : 'erro', falha)
    return Response.json(
      {
        error: 'Não consegui iniciar a conexão. Verifique os dados e tente de novo.',
        reason: reasonForComposioFailure(falha, reasonForActivateThrow(mode)),
      },
      { status: 502 },
    )
  }
}
