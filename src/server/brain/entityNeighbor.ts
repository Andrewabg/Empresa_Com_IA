



import type { NotaCitada } from '../tools/buscarCerebro'
import type { NeighborProvider } from './graphExpand'
import { extractEntities } from './entityExtract'

const ENTITY_QUERY_CAP = 5 


async function notasComEntidade(db: any, entity: string): Promise<string[]> {
  let res = await db.from('note_chunks').select('note_id').textSearch('fts_pt', entity, { type: 'websearch', config: 'portuguese' })
  if (res.error) {
    res = await db.from('note_chunks').select('note_id').ilike('content', `%${entity}%`)
    if (res.error) throw new Error(`entityNeighbor busca "${entity}": ${res.error.message}`)
  }
  return [...new Set<string>((res.data ?? []).map((r: any) => r.note_id as string))] 
}

export function makeEntityNeighborProvider(db: any): NeighborProvider {
  return async (anchorIds: string[]) => {
    if (!anchorIds.length) return []
    const anchorSet = new Set(anchorIds)

    
    const contentRes = await db.from('note_chunks').select('note_id, content, chunk_index').in('note_id', anchorIds)
    if (contentRes.error) throw new Error(`entityNeighbor conteúdo âncoras: ${contentRes.error.message}`)
    const contentByAnchor = new Map<string, string>()
    for (const r of (contentRes.data ?? []) as any[]) {
      contentByAnchor.set(r.note_id, (contentByAnchor.get(r.note_id) ?? '') + '\n' + (r.content ?? ''))
    }

    
    const anchorsByEntity = new Map<string, Set<string>>()
    for (const [aid, content] of contentByAnchor) {
      for (const e of extractEntities(content)) {
        const s = anchorsByEntity.get(e) ?? new Set<string>()
        s.add(aid); anchorsByEntity.set(e, s)
      }
    }
    
    
    const entities = [...anchorsByEntity.entries()]
      .sort((a, b) => b[0].length - a[0].length || b[1].size - a[1].size)
      .slice(0, ENTITY_QUERY_CAP)
    if (!entities.length) return []

    
    const anchorsByNeighbor = new Map<string, Set<string>>()
    const bridgeLenByNeighbor = new Map<string, number>()
    for (const [entity, anchors] of entities) {
      const ids = await notasComEntidade(db, entity)
      for (const nid of ids) {
        if (anchorSet.has(nid)) continue
        const s = anchorsByNeighbor.get(nid) ?? new Set<string>()
        for (const a of anchors) s.add(a)
        anchorsByNeighbor.set(nid, s)
        bridgeLenByNeighbor.set(nid, Math.max(bridgeLenByNeighbor.get(nid) ?? 0, entity.length))
      }
    }
    const neighborIds = [...anchorsByNeighbor.keys()]
    if (!neighborIds.length) return []

    
    const [notesRes, chunksRes] = await Promise.all([
      db.from('notes').select('id, path, title, type, updated').in('id', neighborIds),
      db.from('note_chunks').select('note_id, content, chunk_index').in('note_id', neighborIds),
    ])
    if (notesRes.error) throw new Error(`entityNeighbor notes: ${notesRes.error.message}`)
    if (chunksRes.error) throw new Error(`entityNeighbor chunks: ${chunksRes.error.message}`)
    const firstChunk = new Map<string, string>(), chunkIdx = new Map<string, number>()
    for (const c of (chunksRes.data ?? []) as any[]) {
      const cur = chunkIdx.get(c.note_id)
      if (cur === undefined || c.chunk_index < cur) { chunkIdx.set(c.note_id, c.chunk_index); firstChunk.set(c.note_id, c.content) }
    }
    const results: Array<{ note: NotaCitada; anchorIds: string[] }> = []
    for (const meta of (notesRes.data ?? []) as any[]) {
      const anchorsSet = anchorsByNeighbor.get(meta.id)
      if (!anchorsSet) continue
      const nota: NotaCitada = {
        id: meta.id, título: meta.title, trecho: firstChunk.get(meta.id) ?? (meta.title ?? meta.path),
        caminho: meta.path, agente: null, quando: meta.updated ?? null, origem: 'nota', tipo: meta.type ?? null,
      }
      results.push({ note: nota, anchorIds: [...anchorsSet] })
    }

    
    results.sort((a, b) => b.anchorIds.length - a.anchorIds.length || (bridgeLenByNeighbor.get(b.note.id) ?? 0) - (bridgeLenByNeighbor.get(a.note.id) ?? 0))
    return results
  }
}
