
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { pedirCriativo } from '@/server/tools/trafego/pedirCriativo'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  try {
    const { blocoId } = (await request.json()) as { blocoId?: string }
    if (!blocoId) return NextResponse.json({ error: 'blocoId obrigatório' }, { status: 400 })
    const result = await pedirCriativo({ blocoId, operatorId: auth.id })
    if (!result.ok) return NextResponse.json({ error: result.summary }, { status: 400 })
    return NextResponse.json({ ok: true, taskId: result.taskId })
  } catch (err) {
    console.error('[POST /api/trafego/pedir-criativo]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
