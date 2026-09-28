
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { decidirFerramenta, DECISOES_FERRAMENTA } from '@/server/hiring/confirmar'
import { getSession } from '@/data/hiringSessions'
import { criacaoSobMedidaLiberada } from '@/server/hiring/gate'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const rawBody = await request.json().catch(() => null)
  if (rawBody === null || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return Response.json({ error: 'body JSON inválido ou ausente' }, { status: 400 })
  }
  const body = rawBody as { sessionId?: unknown; slug?: unknown; decisao?: unknown }

  const sessionId = typeof body.sessionId === 'string' && body.sessionId.length > 0 ? body.sessionId : null
  const slug = typeof body.slug === 'string' && body.slug.length > 0 ? body.slug : null
  const decisao = DECISOES_FERRAMENTA.find((d) => d === body.decisao) ?? null
  if (!sessionId || !slug || !decisao) {
    return Response.json({ error: 'sessionId, slug e decisao (pendente|dispensado|aguardando_conexao) são obrigatórios' }, { status: 400 })
  }

  try {
    
    
    const s = await getSession(sessionId)
    if (s && s.mode === 'criacao' && !(await criacaoSobMedidaLiberada())) {
      return Response.json({ error: 'licenca_necessaria' }, { status: 403 })
    }

    const r = await decidirFerramenta(sessionId, slug, decisao)
    if (!r.ok) return Response.json({ error: r.error }, { status: 404 })
    return Response.json({ ok: true, ferramentas: r.ferramentas })
  } catch (err) {
    console.error('[POST /api/loja/contratar/ferramenta]', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
