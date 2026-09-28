import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { listarConvitesPendentes } from '@/data/equipe'

export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    return Response.json({ ok: true, convites: await listarConvitesPendentes() })
  } catch (err) {
    console.error('[GET /api/config/equipe/convites]', err)
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
