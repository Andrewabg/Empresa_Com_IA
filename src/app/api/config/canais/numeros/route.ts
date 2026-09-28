

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { listarNumerosWaba, vincularNumero } from '@/server/canais/configActions'
import { inscreverAppNoWaba } from '@/server/canais/providers/whatsappCloud'
import { baseUrlDaRequisicao } from '@/lib/public-url'
import { getAgentRow } from '@/data/agents'
import { getCanal, updateCanal, updateCanalConfig, type CanalModo } from '@/data/canais'
import { configFollowup } from '@/lib/canais/followup'
import { lerRoteador } from '@/lib/canais/roteamento'

const MODOS: CanalModo[] = ['supervisionado', 'autonomo']

export async function GET() {
  const cookieStore = await cookies()
  const auth = await requireDonoApi(cookieStore)
  if (auth instanceof Response) return auth

  const [token, wabaId] = await Promise.all([
    getSecret(SECRET_KEYS.whatsapp_access_token),
    getSecret(SECRET_KEYS.whatsapp_waba_id),
  ])

  if (!token || !wabaId) {
    return NextResponse.json({ ok: false, reason: 'not_configured' })
  }

  const result = await listarNumerosWaba({ wabaId, token })
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireDonoApi(cookieStore)
  if (auth instanceof Response) return auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  try {
    
    if ('canal_id' in body && 'modo' in body && !('enabled' in body)) {
      const { canal_id, modo } = body
      if (typeof canal_id !== 'string' || !MODOS.includes(modo as CanalModo)) {
        return NextResponse.json({ error: 'canal_id e modo válido obrigatórios' }, { status: 400 })
      }
      if (!(await getCanal(canal_id))) {
        return NextResponse.json({ error: 'Canal não encontrado' }, { status: 400 })
      }
      await updateCanal(canal_id, { modo: modo as CanalModo })
      return NextResponse.json({ ok: true })
    }

    
    
    
    if ('canal_id' in body && 'disclosure' in body) {
      const { canal_id, disclosure } = body
      if (typeof canal_id !== 'string' || typeof disclosure !== 'string') {
        return NextResponse.json({ error: 'canal_id e disclosure (string) obrigatórios' }, { status: 400 })
      }
      if (!(await getCanal(canal_id))) {
        return NextResponse.json({ error: 'canal não encontrado' }, { status: 404 })
      }
      await updateCanalConfig(canal_id, { disclosure: disclosure.trim().slice(0, 300) })
      return NextResponse.json({ ok: true })
    }

    
    
    
    if ('canal_id' in body && 'followup' in body) {
      const { canal_id, followup } = body
      const f = (followup ?? {}) as { ligado?: unknown; horas?: unknown }
      if (typeof canal_id !== 'string' || typeof f.ligado !== 'boolean') {
        return NextResponse.json({ error: 'canal_id e followup.ligado (boolean) obrigatórios' }, { status: 400 })
      }
      if (!(await getCanal(canal_id))) {
        return NextResponse.json({ error: 'canal não encontrado' }, { status: 404 })
      }
      
      
      const { horas } = configFollowup({ followup: { ligado: f.ligado, horas: f.horas } })
      await updateCanalConfig(canal_id, { followup: { ligado: f.ligado, horas } })
      return NextResponse.json({ ok: true, followup: { ligado: f.ligado, horas } })
    }

    
    
    
    
    if ('canal_id' in body && 'roteamento' in body) {
      const { canal_id, roteamento } = body
      if (typeof canal_id !== 'string') {
        return NextResponse.json({ error: 'canal_id obrigatório' }, { status: 400 })
      }
      const canal = await getCanal(canal_id)
      if (!canal) return NextResponse.json({ error: 'canal não encontrado' }, { status: 404 })
      if (roteamento === null) {
        await updateCanalConfig(canal_id, { roteamento: null })
        return NextResponse.json({ ok: true, roteamento: null })
      }
      
      const normalizado = lerRoteador({ roteamento }, canal.agent_id)
      if (!normalizado) {
        return NextResponse.json({ error: 'Informe ao menos dois cargos para dividir o número.' }, { status: 400 })
      }
      const rows = await Promise.all(normalizado.cargos.map((c) => getAgentRow(c.agentId)))
      const ruim = normalizado.cargos.find((_, i) => !rows[i]?.enabled)
      if (ruim) {
        return NextResponse.json({ error: `O cargo "${ruim.nome}" não existe ou está desativado.` }, { status: 400 })
      }
      if (!normalizado.cargos.some((c) => c.agentId === canal.agent_id)) {
        return NextResponse.json({ error: 'O agente do número precisa estar entre os cargos — é quem atende quando nada bate.' }, { status: 400 })
      }
      await updateCanalConfig(canal_id, { roteamento: { cargos: normalizado.cargos } })
      return NextResponse.json({ ok: true, roteamento: { cargos: normalizado.cargos } })
    }

    
    if ('canal_id' in body && 'enabled' in body) {
      const { canal_id, enabled } = body
      if (typeof canal_id !== 'string' || typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'canal_id e enabled (boolean) obrigatórios' }, { status: 400 })
      }
      if (!(await getCanal(canal_id))) {
        return NextResponse.json({ error: 'Canal não encontrado' }, { status: 400 })
      }
      await updateCanal(canal_id, { enabled })
      return NextResponse.json({ ok: true })
    }

    
    const { external_id, rotulo, agent_id, modo } = body
    if (
      typeof external_id !== 'string' ||
      typeof rotulo !== 'string' ||
      typeof agent_id !== 'string' ||
      !MODOS.includes(modo as CanalModo)
    ) {
      return NextResponse.json(
        { error: 'external_id, rotulo, agent_id e modo (supervisionado|autonomo) obrigatórios' },
        { status: 400 },
      )
    }

    const agente = await getAgentRow(agent_id)
    if (!agente || !agente.enabled) {
      return NextResponse.json({ error: 'Agente não encontrado ou inativo' }, { status: 400 })
    }

    const result = await vincularNumero({
      external_id,
      rotulo,
      agent_id,
      modo: modo as CanalModo,
    })

    
    
    
    
    
    
    
    let inscricao: { ok: boolean; detalhe: string } = { ok: false, detalhe: 'sem WABA ID salvo' }
    try {
      const [token, wabaId, verifyToken] = await Promise.all([
        getSecret(SECRET_KEYS.whatsapp_access_token),
        getSecret(SECRET_KEYS.whatsapp_waba_id),
        getSecret(SECRET_KEYS.whatsapp_verify_token),
      ])
      inscricao = token && wabaId
        ? await inscreverAppNoWaba({
            wabaId, token, verifyToken,
            callbackUrl: `${baseUrlDaRequisicao(request)}/api/canais/whatsapp/webhook`,
          })
        : { ok: false, detalhe: 'faltam o token permanente e o WABA ID' }
    } catch (err) {
      inscricao = { ok: false, detalhe: err instanceof Error ? err.message : String(err) }
    }
    return NextResponse.json({ ...result, inscricao })
  } catch (err) {
    console.error('[POST /api/config/canais/numeros]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
