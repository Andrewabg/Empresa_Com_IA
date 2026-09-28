
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getFichaJuridica, upsertFichaJuridica } from '@/data/fichaJuridica'
import { removerAprendizadoJuridico } from '@/lib/juridico/ficha'

export async function GET() {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    const ficha = await getFichaJuridica(auth.id)
    return NextResponse.json({ ok: true, ficha })
  } catch (err) {
    console.error('[GET /api/juridico/ficha]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let body: { action?: unknown; texto?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  
  if (body.action !== 'remover_aprendizado') {
    return NextResponse.json({ error: "action deve ser 'remover_aprendizado'" }, { status: 400 })
  }
  const texto = body.texto
  if (typeof texto !== 'string' || !texto.trim()) {
    return NextResponse.json({ error: 'texto é obrigatório' }, { status: 400 })
  }

  try {
    const atual = await getFichaJuridica(auth.id)
    const next = removerAprendizadoJuridico(atual, texto)
    await upsertFichaJuridica(auth.id, next)
    return NextResponse.json({ ok: true, ficha: next })
  } catch (err) {
    console.error('[PATCH /api/juridico/ficha]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
