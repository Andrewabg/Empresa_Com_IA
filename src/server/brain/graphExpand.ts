
import type { NotaCitada } from '../tools/buscarCerebro'
import { escopoDeLeitura, dentroDoEscopo, type EscopoDeLeitura } from '@/lib/brain/escopoDeLeitura'


export const ATTENUATION = 0.5


export const MAX_NEIGHBORS = 3


export interface Anchor {
  id: string
  score: number
}


export interface NeighborNote {
  note: NotaCitada
  score: number
}


export type NeighborProvider = (
  anchorIds: string[],
) => Promise<Array<{ note: NotaCitada; anchorIds: string[] }>>


function inScope(path: string, escopo: EscopoDeLeitura): boolean {
  if (escopo.modo === 'tudo') return true
  if (escopo.modo === 'nada') return false
  return dentroDoEscopo(path, escopo.prefixos)
}

export interface GraphExpandOpts {
  
  scopes?: string[] | null
  
  cap?: number
  
  attenuation?: number
}


export async function graphExpand(
  anchors: Anchor[],
  provider: NeighborProvider,
  existingIds: Iterable<string>,
  opts: GraphExpandOpts = {},
): Promise<NeighborNote[]> {
  const cap = opts.cap ?? MAX_NEIGHBORS
  const attenuation = opts.attenuation ?? ATTENUATION
  const escopo = escopoDeLeitura(opts.scopes)

  if (!anchors.length || cap <= 0) return []

  
  const anchorScore = new Map<string, number>()
  for (const a of anchors) {
    if (!a.id) continue
    const prev = anchorScore.get(a.id)
    if (prev === undefined || a.score > prev) anchorScore.set(a.id, a.score)
  }
  if (!anchorScore.size) return []

  const seen = new Set<string>(existingIds)

  let raw: Array<{ note: NotaCitada; anchorIds: string[] }>
  try {
    raw = await provider([...anchorScore.keys()])
  } catch (e) {
    console.warn('[graphExpand] neighbor provider fail-open:', e)
    return []
  }

  const out: NeighborNote[] = []
  for (const { note, anchorIds } of raw ?? []) {
    if (out.length >= cap) break
    const id = note?.id
    if (!id || seen.has(id)) continue 
    
    if (!inScope(note.caminho ?? '', escopo)) continue
    
    let best = -Infinity
    for (const aid of anchorIds ?? []) {
      const s = anchorScore.get(aid)
      if (s !== undefined && s > best) best = s
    }
    if (!Number.isFinite(best)) continue 
    seen.add(id)
    out.push({ note: { ...note, origem: 'nota' as const }, score: attenuation * best })
  }
  return out
}


interface EdgeRow {
  from_id: string
  to_id: string
}


interface NoteMetaRow {
  id: string
  path: string
  title: string | null
  type: string | null
  updated: string | null
}


interface ChunkRow {
  note_id: string
  content: string
  chunk_index: number
}


export function makeEdgeNeighborProvider(db: any): NeighborProvider {
  return async (anchorIds: string[]) => {
    if (!anchorIds.length) return []
    const anchorSet = new Set(anchorIds)

    
    const [fwd, bwd] = await Promise.all([
      db.from('edges').select('from_id, to_id').in('from_id', anchorIds),
      db.from('edges').select('from_id, to_id').in('to_id', anchorIds),
    ])
    if (fwd.error) throw new Error(`graphExpand edges(fwd): ${fwd.error.message}`)
    if (bwd.error) throw new Error(`graphExpand edges(bwd): ${bwd.error.message}`)

    
    const anchorsByNeighbor = new Map<string, Set<string>>()
    const add = (neighborId: string, anchorId: string) => {
      if (!neighborId || anchorSet.has(neighborId)) return 
      const s = anchorsByNeighbor.get(neighborId) ?? new Set<string>()
      s.add(anchorId)
      anchorsByNeighbor.set(neighborId, s)
    }
    for (const e of (fwd.data ?? []) as EdgeRow[]) add(e.to_id, e.from_id)
    for (const e of (bwd.data ?? []) as EdgeRow[]) add(e.from_id, e.to_id)

    const neighborIds = [...anchorsByNeighbor.keys()]
    if (!neighborIds.length) return []

    
    
    const [notesRes, chunksRes] = await Promise.all([
      db.from('notes').select('id, path, title, type, updated').in('id', neighborIds),
      db.from('note_chunks').select('note_id, content, chunk_index').in('note_id', neighborIds),
    ])
    if (notesRes.error) throw new Error(`graphExpand notes: ${notesRes.error.message}`)
    if (chunksRes.error) throw new Error(`graphExpand chunks: ${chunksRes.error.message}`)

    
    const firstChunk = new Map<string, string>()
    const chunkIdx = new Map<string, number>()
    for (const c of (chunksRes.data ?? []) as ChunkRow[]) {
      const cur = chunkIdx.get(c.note_id)
      if (cur === undefined || c.chunk_index < cur) {
        chunkIdx.set(c.note_id, c.chunk_index)
        firstChunk.set(c.note_id, c.content)
      }
    }

    const results: Array<{ note: NotaCitada; anchorIds: string[] }> = []
    for (const meta of (notesRes.data ?? []) as NoteMetaRow[]) {
      const anchorsSet = anchorsByNeighbor.get(meta.id)
      if (!anchorsSet) continue
      const nota: NotaCitada = {
        id: meta.id,
        título: meta.title,
        trecho: firstChunk.get(meta.id) ?? (meta.title ?? meta.path),
        caminho: meta.path,
        agente: null,
        quando: meta.updated ?? null,
        origem: 'nota',
        tipo: meta.type ?? null,
      }
      results.push({ note: nota, anchorIds: [...anchorsSet] })
    }
    return results
  }
}
