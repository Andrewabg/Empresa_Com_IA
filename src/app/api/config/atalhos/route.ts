
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { setSetting } from '@/data/settings'
import { getAtalhosRail, invalidateAtalhosRailCache } from '@/server/config/atalhosRail'
import { validarAtalhos, serializarAtalhosRail, ATALHOS_SETTING_KEY, TEXTOS_ATALHOS_RAIL } from '@/lib/atalhosRail'

export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    return Response.json({ ok: true, atalhos: await getAtalhosRail() })
  } catch (err) {
    console.error('[GET /api/config/atalhos]', err)
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: TEXTOS_ATALHOS_RAIL.corpoInvalido }, { status: 400 })
  }
  const resultado = validarAtalhos((body as { atalhos?: unknown } | null)?.atalhos)
  if (!resultado.ok) {
    return Response.json({ ok: false, error: resultado.erro }, { status: 400 })
  }
  try {
    await setSetting(ATALHOS_SETTING_KEY, serializarAtalhosRail(resultado.atalhos))
    invalidateAtalhosRailCache()
    return Response.json({ ok: true, atalhos: resultado.atalhos })
  } catch (err) {
    console.error('[POST /api/config/atalhos]', err)
    return Response.json({ ok: false, error: TEXTOS_ATALHOS_RAIL.salvarFalhou }, { status: 500 })
  }
}
