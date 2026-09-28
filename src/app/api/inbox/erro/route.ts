
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { marcarErroAtendimento, defaultInboxDeps } from '@/server/canais/inboxActions'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  
  let mensagemId = ''
  let nota: string | undefined
  try {
    const body = (await request.json().catch(() => ({}))) as { mensagemId?: unknown; nota?: unknown }
    if (typeof body.mensagemId === 'string') mensagemId = body.mensagemId.trim()
    if (typeof body.nota === 'string') nota = body.nota
  } catch {
    
  }
  if (!mensagemId) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

  try {
    const d = await defaultInboxDeps()
    const res = await marcarErroAtendimento({ mensagemId, nota }, d)
    return NextResponse.json(res)
  } catch (err) {
    console.error('[POST /api/inbox/erro]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
