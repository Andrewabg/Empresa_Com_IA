
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { dismissAgent, readmitAgent, getAgentRow, getPrimaryAgentRow } from '@/data/agents'
import { podeDesligar, podeReadmitir } from '@/lib/agentes/desligamento'
import type { AgentRow } from '@/data/agents'
import { invalidateAgentCache } from '@/server/agent/jarvis'
import { invalidateConnectionsCache } from '@/server/config/connections'


function semPersona(row: AgentRow) {
  const { system_prompt: _omitida, ...resto } = row
  return resto
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  const row = await getAgentRow(id)
  if (!row) return Response.json({ error: 'agente não existe' }, { status: 404 })

  const veredito = podeDesligar(row)
  if (!veredito.ok) return Response.json({ error: veredito.motivo }, { status: 409 })

  const primario = await getPrimaryAgentRow().catch(() => null)
  const desligado = await dismissAgent(id, primario?.id ?? null)
  invalidateAgentCache()
  invalidateConnectionsCache()
  return Response.json({ agent: semPersona(desligado) })
}

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  const row = await getAgentRow(id)
  if (!row) return Response.json({ error: 'agente não existe' }, { status: 404 })

  const veredito = podeReadmitir(row)
  if (!veredito.ok) return Response.json({ error: veredito.motivo }, { status: 409 })

  const readmitido = await readmitAgent(id)
  invalidateAgentCache()
  invalidateConnectionsCache()
  return Response.json({ agent: semPersona(readmitido) })
}
