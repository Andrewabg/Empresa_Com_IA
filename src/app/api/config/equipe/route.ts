import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { listarMembros, contarDonos } from '@/data/equipe'

export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    const [membros, donoCount] = await Promise.all([listarMembros(), contarDonos()])
    
    
    return Response.json({ ok: true, membros, donoCount, voceId: auth.user.id })
  } catch (err) {
    console.error('[GET /api/config/equipe]', err)
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
