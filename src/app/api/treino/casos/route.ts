
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listarCasos, listarTestes } from '@/data/treino'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')?.trim() ?? ''
  if (!agentId) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

  try {
    const [casos, testes] = await Promise.all([listarCasos(agentId), listarTestes(agentId)])
    return NextResponse.json({ casos, testes })
  } catch (err) {
    console.error('[GET /api/treino/casos]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
