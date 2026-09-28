import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { revogarMembro } from '@/data/equipe'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  let body: { userId?: unknown }
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  if (typeof body.userId !== 'string') return Response.json({ ok: false, error: 'userId obrigatório.' }, { status: 400 })
  try {
    const removeu = await revogarMembro(body.userId)
    if (!removeu) return Response.json({ ok: false, error: 'Não foi possível revogar (o último Dono não pode ser removido).' }, { status: 409 })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/config/equipe/revogar]', err)
    return Response.json({ ok: false, error: 'Erro ao revogar.' }, { status: 500 })
  }
}
