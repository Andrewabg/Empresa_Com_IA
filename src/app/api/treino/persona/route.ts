
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getPersonaCampos, setPersonaCampos } from '@/data/treino'
import type { PersonaCampos } from '@/lib/treino/persona'
import { ehAgenteDeCanal } from '@/server/canais/ehAgenteDeCanal'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')?.trim() ?? ''
  if (!agentId) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

  try {
    const campos = await getPersonaCampos(agentId)
    return NextResponse.json({ campos })
  } catch (err) {
    console.error('[GET /api/treino/persona]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let agentId = ''
  let campos: Record<string, unknown> | undefined
  try {
    const body = (await request.json().catch(() => ({}))) as { agentId?: unknown; campos?: unknown }
    if (typeof body.agentId === 'string') agentId = body.agentId.trim()
    if (body.campos !== null && typeof body.campos === 'object' && !Array.isArray(body.campos)) {
      campos = body.campos as Record<string, unknown>
    }
  } catch {
    
  }
  if (!agentId || campos === undefined) {
    return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
  }

  
  if (await ehAgenteDeCanal(agentId)) {
    return NextResponse.json(
      { error: 'Edite a personalidade no Treino.', redirect: 'draft' },
      { status: 409 },
    )
  }

  
  const safe: PersonaCampos = {}
  if (typeof campos.quem_e === 'string') safe.quem_e = campos.quem_e
  if (typeof campos.tom === 'string') safe.tom = campos.tom
  if (Array.isArray(campos.nunca_faz) && campos.nunca_faz.every((x) => typeof x === 'string')) safe.nunca_faz = campos.nunca_faz as string[]

  try {
    await setPersonaCampos(agentId, safe)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/treino/persona]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
