
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { confirmarContratacao } from '@/server/hiring/confirmar'
import { getSession } from '@/data/hiringSessions'
import { criacaoSobMedidaLiberada } from '@/server/hiring/gate'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const rawBody = await request.json().catch(() => null)
  if (rawBody === null || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return Response.json({ error: 'body JSON inválido ou ausente' }, { status: 400 })
  }
  const body = rawBody as { sessionId?: unknown; nome?: unknown }

  const sessionId = typeof body.sessionId === 'string' && body.sessionId.length > 0 ? body.sessionId : null
  if (!sessionId) return Response.json({ error: 'sessionId obrigatório' }, { status: 400 })

  const nomeRaw = typeof body.nome === 'string' ? body.nome.trim() : undefined
  if (nomeRaw !== undefined && nomeRaw.length > 120) {
    return Response.json({ error: 'nome não pode ultrapassar 120 caracteres' }, { status: 400 })
  }
  const nome = nomeRaw

  try {
    
    
    
    const s = await getSession(sessionId)
    if (s && s.mode === 'criacao' && !(await criacaoSobMedidaLiberada())) {
      return Response.json({ error: 'licenca_necessaria' }, { status: 403 })
    }

    const r = await confirmarContratacao(sessionId, nome)
    if (r.ok) return Response.json({ agentId: r.agentId, workspaceHref: r.workspaceHref })
    switch (r.error) {
      case 'sessao_inexistente':
        return Response.json({ error: r.error }, { status: 404 })
      case 'ja_existe':
        return Response.json({ error: r.error, existingId: r.existingId, msg: r.msg }, { status: 409 })
      case 'cobertura_incompleta':
        return Response.json({ error: r.error, faltam: r.faltam }, { status: 409 })
      default:
        
        return Response.json({ error: r.error }, { status: 409 })
    }
  } catch (err) {
    console.error('[POST /api/loja/contratar/confirmar]', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
