
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getContrato, setContratoStatus } from '@/data/contratos'
import { toContratoView } from '@/lib/juridico/types'
import type { ContratoStatus } from '@/lib/juridico/types'

const STATUS_PERMITIDOS: readonly ContratoStatus[] = ['arquivado', 'rascunho', 'em_revisao']

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  const { id } = await ctx.params

  let body: { status?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const status = body.status
  if (typeof status !== 'string' || !STATUS_PERMITIDOS.includes(status as ContratoStatus)) {
    return NextResponse.json(
      { error: `status deve ser um de ${STATUS_PERMITIDOS.join(', ')}` },
      { status: 400 },
    )
  }

  try {
    const row = await getContrato(id, auth.id)
    if (!row) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

    const updated = await setContratoStatus(id, auth.id, status as ContratoStatus)
    return NextResponse.json({ ok: true, contrato: toContratoView(updated) })
  } catch (err) {
    console.error('[PATCH /api/juridico/contratos/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
