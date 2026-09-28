
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { rodarRegressao, RegressaoSemChave } from '@/server/treino/regression'
import { MSG_REGRESSAO_SEM_CHAVE } from '@/lib/treino/copyRegressao'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let agentId = ''
  try {
    const body = (await request.json().catch(() => ({}))) as { agentId?: unknown }
    if (typeof body.agentId === 'string') agentId = body.agentId.trim()
  } catch {
    
  }
  if (!agentId) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

  try {
    const placar = await rodarRegressao(agentId)
    return NextResponse.json({ placar })
  } catch (err) {
    
    
    if (err instanceof RegressaoSemChave) {
      return NextResponse.json({ error: MSG_REGRESSAO_SEM_CHAVE, reason: 'sem_chave' as const }, { status: 409 })
    }
    console.error('[POST /api/treino/replay-tudo]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
