
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getAgentRow } from '@/data/agents'
import type { CanalModo } from '@/data/canais'
import {
  conectarInstancia, statusConexao, reconectar, desconectar, removerCanal, salvarModoTeste,
} from '@/server/canais/uazapiConfigActions'
import { baseUrlDaRequisicao } from '@/lib/public-url'

const MODOS: CanalModo[] = ['supervisionado', 'autonomo']

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

  
  
  const baseUrl = baseUrlDaRequisicao(request)

  try {
    const acao = body.acao

    if (acao === 'conectar') {
      const { server_url, admin_token, agent_id, modo, rotulo, modo_teste, numeros_teste } = body
      if (
        typeof server_url !== 'string' || typeof admin_token !== 'string' ||
        typeof agent_id !== 'string' || !MODOS.includes(modo as CanalModo)
      ) {
        return NextResponse.json({ error: 'server_url, admin_token, agent_id e modo (supervisionado|autonomo) obrigatórios' }, { status: 400 })
      }
      const agente = await getAgentRow(agent_id)
      if (!agente || !agente.enabled) {
        return NextResponse.json({ error: 'Agente não encontrado ou inativo' }, { status: 400 })
      }
      
      const nome = `awave-${crypto.randomUUID().slice(0, 8)}`
      const modoTeste = modo_teste === true
      const result = await conectarInstancia({
        serverUrl: server_url.trim(),
        adminToken: admin_token.trim(),
        agentId: agent_id,
        rotulo: typeof rotulo === 'string' && rotulo.trim() ? rotulo.trim() : (agente.name ?? 'WhatsApp'),
        modo: modo as CanalModo,
        nome,
        baseUrl,
        modoTeste,
        
        numerosTeste: modoTeste && Array.isArray(numeros_teste) ? numeros_teste.map((n) => String(n)) : [],
      })
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    if (acao === 'status' || acao === 'reconectar' || acao === 'desconectar' || acao === 'remover') {
      const { canal_id } = body
      if (typeof canal_id !== 'string') {
        return NextResponse.json({ error: 'canal_id obrigatório' }, { status: 400 })
      }
      const result =
        acao === 'status' ? await statusConexao(canal_id)
        : acao === 'reconectar' ? await reconectar(canal_id)
        : acao === 'remover' ? await removerCanal(canal_id)
        : await desconectar(canal_id)
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    if (acao === 'modo_teste') {
      const { canal_id, modo_teste, numeros_teste } = body
      if (typeof canal_id !== 'string' || typeof modo_teste !== 'boolean') {
        return NextResponse.json({ error: 'canal_id e modo_teste (boolean) obrigatórios' }, { status: 400 })
      }
      const lista = Array.isArray(numeros_teste) ? numeros_teste.map((n) => String(n)) : []
      const result = await salvarModoTeste(canal_id, { modo_teste, numeros_teste: lista })
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    return NextResponse.json({ error: 'ação desconhecida' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/config/canais/uazapi]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
