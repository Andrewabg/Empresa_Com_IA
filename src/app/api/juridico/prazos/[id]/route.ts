
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getMembro } from '@/server/auth/membro'
import { getPrazo, updatePrazo, getPrazoQualquerOperador, updatePrazoQualquerOperador, type PrazoRow } from '@/data/prazos'
import type { PrazoStatus } from '@/lib/juridico/prazosTipos'
import { toPrazoView } from '@/lib/juridico/prazosTipos'

const ACTIONS = ['adiar', 'resolver', 'dispensar'] as const
type Action = (typeof ACTIONS)[number]

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  const { id } = await ctx.params

  let body: { action?: unknown; ate?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.action || !ACTIONS.includes(body.action as Action)) {
    return NextResponse.json({ error: 'action deve ser adiar | resolver | dispensar' }, { status: 400 })
  }
  const action = body.action as Action

  if (action === 'adiar') {
    if (typeof body.ate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.ate)) {
      return NextResponse.json({ error: 'ate (YYYY-MM-DD) é obrigatório para adiar' }, { status: 400 })
    }
  }

  try {
    
    
    let ehDono = false
    try { ehDono = (await getMembro(cookieStore))?.papel === 'dono' } catch (err) {
      console.warn('[PATCH /api/juridico/prazos/:id] leitura do papel falhou (fica no escopo do operador):', err)
    }
    const buscar = (): Promise<PrazoRow | null> => (ehDono ? getPrazoQualquerOperador(id) : getPrazo(id, auth.id))
    const atualizar = (patch: { status?: PrazoStatus; data_alvo?: string }): Promise<PrazoRow> =>
      ehDono ? updatePrazoQualquerOperador(id, patch) : updatePrazo(id, auth.id, patch)

    const prazo = await buscar()
    if (!prazo) return NextResponse.json({ error: 'Prazo não encontrado' }, { status: 404 })

    let updated
    if (action === 'adiar') {
      updated = await atualizar({ data_alvo: body.ate as string })
    } else if (action === 'resolver') {
      updated = await atualizar({ status: 'resolvido' })
    } else {
      updated = await atualizar({ status: 'dispensado' })
    }

    return NextResponse.json({ ok: true, prazo: toPrazoView(updated) })
  } catch (err) {
    console.error('[PATCH /api/juridico/prazos/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
