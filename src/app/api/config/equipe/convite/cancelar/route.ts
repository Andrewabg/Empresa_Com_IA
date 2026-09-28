import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { cancelarConvite } from '@/data/equipe'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  let body: { conviteId?: unknown }
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  if (typeof body.conviteId !== 'string') return Response.json({ ok: false, error: 'conviteId obrigatório.' }, { status: 400 })
  try {
    const removeu = await cancelarConvite(body.conviteId)
    if (!removeu) return Response.json({ ok: false, error: 'Convite não encontrado ou já aceito.' }, { status: 404 })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/config/equipe/convite/cancelar]', err)
    return Response.json({ ok: false, error: 'Erro ao cancelar o convite.' }, { status: 500 })
  }
}
