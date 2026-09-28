




import { getAgentRow as getAgentRowReal } from '@/data/agents'
import { listCanais as listCanaisReal } from '@/data/canais'
import type { AgentRow } from '@/data/agents'
import type { CanalRow } from '@/data/canais'
import { atendeAlgumCanal } from '@/lib/canais/atendentes'

export interface EhAgenteDeCanalDeps {
  getAgentRow: (id: string) => Promise<Pick<AgentRow, 'id' | 'is_primary'> | null>
  listCanais: () => Promise<Array<Pick<CanalRow, 'agent_id' | 'config'>>>
}


export async function ehAgenteDeCanal(
  agentId: string,
  deps: EhAgenteDeCanalDeps = { getAgentRow: getAgentRowReal, listCanais: listCanaisReal },
): Promise<boolean> {
  const row = await deps.getAgentRow(agentId)
  if (!row || row.is_primary) return false
  const canais = await deps.listCanais()
  return atendeAlgumCanal(agentId, canais)
}
