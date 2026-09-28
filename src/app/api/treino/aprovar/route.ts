
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getCaso, marcarInstavel } from '@/data/treino'
import { getAgentRow } from '@/data/agents'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { Proposta } from '@/server/treino/trainer'
import { aplicarCorrecao } from '@/server/treino/apply'
import { replayCaso } from '@/server/treino/replay'
import { julgarCaso } from '@/server/treino/judge'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let casoId = ''
  let propostaRaw: unknown = undefined
  try {
    const body = (await request.json().catch(() => ({}))) as { casoId?: unknown; proposta?: unknown }
    if (typeof body.casoId === 'string') casoId = body.casoId.trim()
    propostaRaw = body.proposta
  } catch {
    
  }
  if (!casoId || propostaRaw === undefined) {
    return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
  }

  const parsed = Proposta.safeParse(propostaRaw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
  }

  try {
    const caso = await getCaso(casoId)
    if (!caso) return NextResponse.json({ ok: false, reason: 'not_found' as const }, { status: 400 })

    await aplicarCorrecao(caso, parsed.data)

    const antes = caso.resposta_dada

    const [row, apiKey] = await Promise.all([
      getAgentRow(caso.agent_id),
      getSecret(SECRET_KEYS.openai_api_key),
    ])

    if (!row || !apiKey) {
      return NextResponse.json({ ok: true, antes, depois: null, veredito: null })
    }

    try {
      const depois = await replayCaso(caso, row, apiKey)
      const veredito = await julgarCaso(parsed.data.criterio, depois, caso.agent_id)
      
      try {
        await marcarInstavel(casoId, veredito.estavel)
      } catch (markErr) {
        console.warn('[POST /api/treino/aprovar] marcarInstavel falhou (veredito ok):', markErr)
      }
      return NextResponse.json({ ok: true, antes, depois, veredito })
    } catch (replayErr) {
      console.warn('[POST /api/treino/aprovar] replay/judge falhou (apply já sucedeu):', replayErr)
      return NextResponse.json({ ok: true, antes, depois: null, veredito: null })
    }
  } catch (err) {
    console.error('[POST /api/treino/aprovar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
