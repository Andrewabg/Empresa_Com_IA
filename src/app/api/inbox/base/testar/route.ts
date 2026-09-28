
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { testarPerguntaBase } from '@/server/canais/baseActions'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let pergunta = ''
  let agentId = ''

  try {
    const body = (await request.json().catch(() => ({}))) as { pergunta?: unknown; agentId?: unknown }
    if (typeof body.pergunta === 'string') pergunta = body.pergunta.trim()
    if (typeof body.agentId === 'string') agentId = body.agentId.trim()
  } catch {
    
  }

  if (!pergunta || !agentId) {
    return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
  }

  try {
    const res = await testarPerguntaBase({ pergunta, agentId })
    return NextResponse.json({ ok: true, resultados: res.resultados })
  } catch (err) {
    console.error('[POST /api/inbox/base/testar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
