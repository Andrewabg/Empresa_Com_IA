
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { desfazerCorrecao } from '@/server/treino/undo'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let correcaoId = ''
  try {
    const body = (await request.json().catch(() => ({}))) as { correcaoId?: unknown }
    if (typeof body.correcaoId === 'string') correcaoId = body.correcaoId.trim()
  } catch {
    
  }
  if (!correcaoId) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

  try {
    const resultado = await desfazerCorrecao(correcaoId)
    if (!resultado.ok) return NextResponse.json({ ok: false, reason: resultado.motivo ?? 'undo_failed' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/treino/desfazer]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
