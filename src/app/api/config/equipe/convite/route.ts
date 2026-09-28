import { cookies, headers } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { criarConvite } from '@/data/equipe'
import { gerarToken, hashToken } from '@/lib/equipe-token'
import type { Papel } from '@/lib/equipe'

const CONVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  let body: { papel?: unknown; rotulo?: unknown }
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  const papel = body.papel
  if (papel !== 'dono' && papel !== 'membro') {
    return Response.json({ ok: false, error: 'Papel inválido.' }, { status: 400 })
  }
  const rotuloRaw = body.rotulo
  const rotulo = typeof rotuloRaw === 'string' && rotuloRaw.trim() ? rotuloRaw.trim().slice(0, 80) : null
  try {
    const raw = gerarToken()
    await criarConvite({
      tokenHash: hashToken(raw), papel: papel as Papel,
      criadoPor: auth.user.id, expiraEm: new Date(Date.now() + CONVITE_TTL_MS).toISOString(),
      rotulo,
    })
    const h = await headers()
    const origin = h.get('origin') ?? `https://${h.get('host') ?? ''}`
    return Response.json({ ok: true, link: `${origin}/convite/${raw}` })
  } catch (err) {
    console.error('[POST /api/config/equipe/convite]', err)
    return Response.json({ ok: false, error: 'Não foi possível gerar o convite.' }, { status: 500 })
  }
}
