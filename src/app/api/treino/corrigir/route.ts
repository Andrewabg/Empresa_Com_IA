
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getCaso, getPersonaCampos } from '@/data/treino'
import { getDirectives } from '@/data/agentDirectives'
import { listBase } from '@/data/baseConhecimento'
import { proporCorrecao } from '@/server/treino/trainer'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let casoId = ''
  let fala = ''
  try {
    const body = (await request.json().catch(() => ({}))) as { casoId?: unknown; fala?: unknown }
    if (typeof body.casoId === 'string') casoId = body.casoId.trim()
    if (typeof body.fala === 'string') fala = body.fala.trim()
  } catch {
    
  }
  if (!casoId || !fala) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

  try {
    const caso = await getCaso(casoId)
    if (!caso) return NextResponse.json({ ok: false, reason: 'not_found' as const }, { status: 400 })

    const [dirRow, personaCampos, todasEntradas] = await Promise.all([
      getDirectives(caso.agent_id),
      getPersonaCampos(caso.agent_id),
      listBase(),
    ])

    const diretrizes = dirRow.diretrizes.map((d) => d.texto)
    const personaResumo = JSON.stringify(personaCampos)
    const baseResumo = todasEntradas
      .filter((e) => e.agent_id === caso.agent_id && e.enabled)
      .map((e) => e.titulo)
      .join('; ')

    const proposta = await proporCorrecao({
      agentId: caso.agent_id,
      sinal: caso.sinal,
      respostaDada: caso.resposta_dada,
      mensagens: caso.estimulo.mensagens,
      fala,
      baseResumo,
      diretrizes,
      personaResumo,
    })

    return NextResponse.json({ proposta })
  } catch (err) {
    console.error('[POST /api/treino/corrigir]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
