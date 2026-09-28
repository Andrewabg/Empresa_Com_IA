
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getContrato, appendContratoVersao, mergeContratoMeta } from '@/data/contratos'
import { preencherMarcadores } from '@/lib/juridico/preencher'
import { toContratoView } from '@/lib/juridico/types'

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  const { id } = await ctx.params

  let body: { valores?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = body.valores
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'valores (objeto descrição→valor) é obrigatório' }, { status: 400 })
  }
  
  const valores: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') valores[k] = v
  }

  try {
    const row = await getContrato(id, auth.id)
    if (!row) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    if (row.kind !== 'gerado') {
      return NextResponse.json({ error: 'Só minutas geradas têm lacunas para preencher.' }, { status: 400 })
    }

    const { texto, restantes } = preencherMarcadores(row.texto, valores)
    if (texto === row.texto) {
      
      return NextResponse.json({ ok: true, contrato: toContratoView(row) })
    }

    await appendContratoVersao(id, { texto, nota: 'lacunas preenchidas pelo operador' })
    const updated = await mergeContratoMeta(id, auth.id, { pendencias: restantes })
    return NextResponse.json({ ok: true, contrato: toContratoView(updated) })
  } catch (err) {
    console.error('[POST /api/juridico/contratos/:id/preencher]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
