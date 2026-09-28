

import { listBaseByAgent as listReal } from '@/data/baseConhecimento'
import { setEntradaEnabled as setEnabledReal, deleteEntradaBase as deleteReal } from '@/data/baseConhecimento'
import { salvarEntradaBase as salvarReal } from '@/server/canais/baseActions'
import type { BaseOps } from '@/lib/canais/baseOps'

export interface AplicarBaseOpsDeps {
  
  
  listBaseByAgent?: (agentId: string) => Promise<{ id: string; agent_id: string | null }[]>
  salvarEntradaBase?: typeof salvarReal
  setEntradaEnabled?: typeof setEnabledReal
  deleteEntradaBase?: typeof deleteReal
}

export async function aplicarBaseOps(agentId: string, ops: BaseOps, deps: AplicarBaseOpsDeps = {}): Promise<void> {
  const list = deps.listBaseByAgent ?? listReal
  const salvar = deps.salvarEntradaBase ?? salvarReal
  const setEnabled = deps.setEntradaEnabled ?? setEnabledReal
  const del = deps.deleteEntradaBase ?? deleteReal

  const vivas = await list(agentId)
  const editaveis = new Set(vivas.filter((e) => e.agent_id === agentId).map((e) => e.id))

  for (const a of ops.add ?? []) {
    await salvar({ titulo: a.titulo, conteudo: a.conteudo, tipo: a.tipo, agent_id: agentId, origem: 'operador' })
  }
  for (const u of ops.update ?? []) {
    if (!editaveis.has(u.id)) continue
    await salvar({ id: u.id, titulo: u.titulo, conteudo: u.conteudo, tipo: u.tipo, agent_id: agentId, origem: 'operador' })
  }
  for (const t of ops.toggle ?? []) {
    if (!editaveis.has(t.id)) continue
    await setEnabled(t.id, t.enabled)
  }
  for (const id of ops.remove ?? []) {
    if (!editaveis.has(id)) continue
    await del(id)
  }
}
