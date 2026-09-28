
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { pedirArte } from '@/server/tools/estudio/pedirArte'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  try {
    const { pecaId } = (await request.json()) as { pecaId?: string }
    if (!pecaId) return NextResponse.json({ error: 'pecaId obrigatório' }, { status: 400 })
    const result = await pedirArte({ pecaId, operatorId: auth.id })
    if (!result.ok) return NextResponse.json({ error: result.summary }, { status: 400 })
    return NextResponse.json({ ok: true, taskId: result.taskId })
  } catch (err) {
    console.error('[POST /api/estudio/pedir-arte]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
