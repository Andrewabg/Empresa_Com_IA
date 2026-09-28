
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getContrato } from '@/data/contratos'
import { createPrazos, type NovoPrazo } from '@/data/prazos'
import { toPrazoView, type PrazoTipo } from '@/lib/juridico/prazosTipos'

const TIPOS: readonly PrazoTipo[] = ['renovacao', 'aviso_previo', 'expiracao', 'pagamento', 'compromisso']

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  const { id } = await ctx.params

  let body: { prazos?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!Array.isArray(body.prazos)) return NextResponse.json({ error: 'prazos[] obrigatório' }, { status: 400 })

  const novos: NovoPrazo[] = []
  for (const raw of body.prazos as unknown[]) {
    if (!raw || typeof raw !== 'object') continue
    const p = raw as Record<string, unknown>
    if (typeof p.tipo !== 'string' || !TIPOS.includes(p.tipo as PrazoTipo)) continue
    if (typeof p.titulo !== 'string' || typeof p.data_alvo !== 'string') continue
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.data_alvo)) continue
    const janela = typeof p.janela_dias === 'number' ? p.janela_dias : 30
    novos.push({ contratoId: id, tipo: p.tipo as PrazoTipo, titulo: p.titulo, dataAlvo: p.data_alvo, janelaDias: janela })
  }
  if (novos.length === 0) return NextResponse.json({ error: 'nenhum prazo válido' }, { status: 400 })

  try {
    const row = await getContrato(id, auth.id)
    if (!row) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    const criados = await createPrazos(auth.id, 'juridico', novos)
    return NextResponse.json({ ok: true, prazos: criados.map(toPrazoView) })
  } catch (err) {
    console.error('[POST …/prazos]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
