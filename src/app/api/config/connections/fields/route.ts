
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getComposioClient } from '@/server/actions/composio'
import { planActivationFromToolkit, type ToolkitAuthMeta } from '@/server/config/connections'

export async function GET(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const slug = new URL(request.url).searchParams.get('slug')
  if (!slug) return Response.json({ error: 'slug obrigatório' }, { status: 400 })
  const c = await getComposioClient()
  if (!c) return Response.json({ error: 'composio não configurado' }, { status: 409 })
  try {
    
    
    
    const tk = (await c.toolkits.get(slug)) as unknown as ToolkitAuthMeta
    return Response.json(planActivationFromToolkit(tk))
  } catch (err) {
    console.warn('[connections/fields] falhou:', err instanceof Error ? err.message : err)
    return Response.json({ error: 'não consegui ler o toolkit' }, { status: 502 })
  }
}
