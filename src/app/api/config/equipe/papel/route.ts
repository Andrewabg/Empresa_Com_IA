import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { setPapel } from '@/data/equipe'
import type { Papel } from '@/lib/equipe'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  let body: { userId?: unknown; papel?: unknown }
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  if (typeof body.userId !== 'string' || (body.papel !== 'dono' && body.papel !== 'membro')) {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 })
  }
  try {
    const mudou = await setPapel(body.userId, body.papel as Papel)
    if (!mudou) {
      return Response.json({ ok: false, error: 'Não foi possível mudar o papel (o último Dono não pode ser rebaixado).' }, { status: 409 })
    }
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/config/equipe/papel]', err)
    return Response.json({ ok: false, error: 'Erro ao mudar o papel.' }, { status: 500 })
  }
}
