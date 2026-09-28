


import { extractEntities } from '../brain/entityExtract'
import { buscarEntradasPorEntidade } from '@/data/baseConhecimento'
import { ENTITY_QUERY_CAP, MAX_NEIGHBORS_BASE } from '@/lib/canais/recuperacaoBudget'

export interface EntradaVizinha { id: string; titulo: string; conteudo: string; tipo: 'fato' | 'playbook' }
export interface ExpandirBaseDeps { buscarPorEntidade?: (entity: string) => Promise<EntradaVizinha[]> }


export async function expandirBase(
  anchors: { id: string; titulo: string; conteudo: string }[],
  agentId: string,
  deps: ExpandirBaseDeps = {},
): Promise<EntradaVizinha[]> {
  if (!anchors.length) return []
  const buscar = deps.buscarPorEntidade ?? ((e: string) => buscarEntradasPorEntidade(e, agentId))
  const anchorSet = new Set(anchors.map((a) => a.id))
  try {
    const anchorsByEntity = new Map<string, Set<string>>()
    for (const a of anchors) {
      for (const e of extractEntities(`${a.titulo}\n${a.conteudo}`)) {
        const s = anchorsByEntity.get(e) ?? new Set<string>(); s.add(a.id); anchorsByEntity.set(e, s)
      }
    }
    const entities = [...anchorsByEntity.entries()]
      .sort((x, y) => y[0].length - x[0].length || y[1].size - x[1].size)
      .slice(0, ENTITY_QUERY_CAP)
    if (!entities.length) return []
    const byId = new Map<string, { entrada: EntradaVizinha; anchors: Set<string>; bridge: number }>()
    for (const [entity, anchorsOfE] of entities) {
      for (const row of await buscar(entity)) {
        if (anchorSet.has(row.id)) continue
        const cur = byId.get(row.id) ?? { entrada: row, anchors: new Set<string>(), bridge: 0 }
        for (const a of anchorsOfE) cur.anchors.add(a)
        cur.bridge = Math.max(cur.bridge, entity.length)
        byId.set(row.id, cur)
      }
    }
    return [...byId.values()]
      .sort((x, y) => y.anchors.size - x.anchors.size || y.bridge - x.bridge)
      .slice(0, MAX_NEIGHBORS_BASE)
      .map((v) => v.entrada)
  } catch (e) {
    console.warn('[expandirBase] fail-open:', e)
    return []
  }
}
