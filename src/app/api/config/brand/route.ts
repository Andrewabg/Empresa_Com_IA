
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { setSetting } from '@/data/settings'
import { getBranding, invalidateBrandingCache } from '@/server/config/branding'
import { NAME_MAX, isHexColor, type BrandSettingKey } from '@/lib/branding'

export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    return Response.json({ ok: true, branding: await getBranding() })
  } catch (err) {
    console.error('[GET /api/config/brand]', err)
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  
  
  const writes: Array<[BrandSettingKey, string]> = []
  
  
  
  if (body.app_name !== undefined) {
    if (typeof body.app_name !== 'string') {
      return Response.json({ ok: false, error: 'app_name deve ser texto.' }, { status: 400 })
    }
    writes.push(['brand_app_name', body.app_name.trim().slice(0, NAME_MAX)])
  }
  
  if (body.accent !== undefined) {
    const a = body.accent as { from?: unknown; to?: unknown } | null
    const from = typeof a?.from === 'string' ? a.from.trim() : ''
    const to = typeof a?.to === 'string' ? a.to.trim() : ''
    if (!isHexColor(from) || !isHexColor(to)) {
      return Response.json(
        { ok: false, error: 'Cores inválidas — use o formato #RRGGBB.' },
        { status: 400 },
      )
    }
    writes.push(['brand_accent', JSON.stringify({ from, to })])
  }

  
  
  
  
  try {
    await Promise.all(writes.map(([key, value]) => setSetting(key, value)))
    if (writes.length) invalidateBrandingCache()
    return Response.json({ ok: true, branding: await getBranding() })
  } catch (err) {
    console.error('[POST /api/config/brand]', err)
    return Response.json({ ok: false, error: 'Não foi possível salvar. Tente de novo.' }, { status: 500 })
  }
}
