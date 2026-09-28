












import { lerRoteador } from './roteamento'


export interface CanalComRoteamento {
  agent_id: string
  config?: unknown
}


export function agentesDoCanal(canal: CanalComRoteamento): string[] {
  const roteador = lerRoteador(canal.config, canal.agent_id)
  const ids = [canal.agent_id, ...(roteador?.cargos.map((c) => c.agentId) ?? [])]
  return [...new Set(ids.filter((id) => typeof id === 'string' && id.trim()))]
}


export function idsDeAtendentes(canais: CanalComRoteamento[]): Set<string> {
  return new Set(canais.flatMap(agentesDoCanal))
}


export function atendeAlgumCanal(agentId: string, canais: CanalComRoteamento[]): boolean {
  return canais.some((c) => agentesDoCanal(c).includes(agentId))
}
