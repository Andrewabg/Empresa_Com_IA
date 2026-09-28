
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { NotConfiguredError } from '@/server/brain/runtime'
import { runHiringTurn } from '@/server/hiring/turn'
import { startOrResumeRevisao } from '@/server/hiring/revisao'
import { criacaoSobMedidaLiberada } from '@/server/hiring/gate'
import { createSession, getSession, getSessionEmAndamento, type HiringSessionRow } from '@/data/hiringSessions'
import { RETOMADA_MAX_MS } from '@/lib/hiring/retomada'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const rawBody = await request.json().catch(() => null)
  if (rawBody === null || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return Response.json({ error: 'body JSON inválido ou ausente' }, { status: 400 })
  }
  const body = rawBody as { sessionId?: unknown; userText?: unknown; kickoff?: unknown; recomecar?: unknown; agent?: unknown }

  const kickoff = body.kickoff === true
  const recomecar = body.recomecar === true
  const userText = typeof body.userText === 'string' ? body.userText.trim() : ''
  if (!kickoff && !userText) {
    return Response.json({ error: 'userText obrigatório' }, { status: 400 })
  }
  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId.length > 0 ? body.sessionId : undefined
  
  const agentIdRevisao =
    typeof body.agent === 'string' && body.agent.length > 0 ? body.agent : undefined

  try {
    let session: HiringSessionRow
    if (sessionId) {
      const s = await getSession(sessionId)
      if (!s || s.status !== 'em_andamento') {
        return Response.json({ error: 'sessao_inexistente' }, { status: 404 })
      }
      
      if (s.mode === 'criacao' && !(await criacaoSobMedidaLiberada())) {
        return Response.json({ error: 'licenca_necessaria' }, { status: 403 })
      }
      session = s
    } else if (agentIdRevisao) {
      const r = await startOrResumeRevisao(agentIdRevisao)
      if ('error' in r) {
        const status = r.error === 'agente_inexistente' ? 404 : 400
        return Response.json({ error: r.error }, { status })
      }
      session = r.session
    } else {
      
      
      if (!(await criacaoSobMedidaLiberada())) {
        return Response.json({ error: 'licenca_necessaria' }, { status: 403 })
      }
      const atual = recomecar ? null : await getSessionEmAndamento()
      const retomavel = atual !== null && Date.now() - Date.parse(atual.updated_at) < RETOMADA_MAX_MS
      session = retomavel && atual ? atual : await createSession('criacao')
    }

    return await runHiringTurn({
      session,
      userText: userText || undefined,
      kickoff,
      operatorId: auth.user.id,
      
      
      ...(sessionId ? {} : { emitSessionId: true }),
    })
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return Response.json({ needsConfig: true }, { status: 200 })
    }
    console.error('[POST /api/loja/contratar/chat]', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
