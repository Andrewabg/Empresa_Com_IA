import type { NotaCitada } from '../tools/buscarCerebro'
import { rerankSignal } from './rerankHeuristico'
import type { ReadBrain } from '../brain/readBrain'
import { searchEpisodic, touchEpisodicAccessed, type EpisodicHit } from '../../data/episodicMemory'
import {
  graphExpand,
  makeEdgeNeighborProvider,
  type NeighborProvider,
} from '../brain/graphExpand'
import { makeEntityNeighborProvider } from '../brain/entityNeighbor'
import { combineNeighborProviders } from '../brain/combineNeighbors'
import { estaArquivada } from '@/lib/brain/arquivoDeNotas'
import { linhasDeSinal, type AlvoDoSinal, type LinhaDeSinal } from '@/lib/memory/sinalDeUso'
import { registrarUso as registrarUsoImpl } from '@/data/sinalDeUso'
import { fusoDoDonoMemoizado } from '@/server/config/fusoDoDonoMemo'
import { PISO_DISTANCIA_EPISODICO, passaNoPiso } from '@/lib/brain/pisoEDiversidade'

type Brain = ReadBrain

const DAY = 86_400_000


const RECENCY_TAU_DAYS = 30


const RECENCY_FLOOR = 0.3


const POOL_MIN = 24
const POOL_MAX = 40
export function poolSize(k: number): number {
  return Math.min(POOL_MAX, Math.max(POOL_MIN, k * 4))
}


export interface RankedItem {
  note: NotaCitada
  rank: number    
  recency: number 
  
  relevance?: number
  
  rerank?: number
  
  canonical?: boolean
  
  scoreOverride?: number
}




const RRF_K = 15
const RECENCY_W = 0.02    
const REL_W = 0.03        
const CANON_BOOST = 0.04  




const RERANK_W = 0.02


const CANONICAL_TYPES = new Set(['semantic', 'procedural'])
export function isCanonicalType(type: string | null | undefined): boolean {
  return !!type && CANONICAL_TYPES.has(type)
}


export const STITCH_CAP = 4000


export interface NoteChunk {
  content: string
  chunk_index: number
}


export function withHeading(trecho: string, título: string | null | undefined, path: string): string {
  const label = (título ?? '').trim() || path
  if (!label) return trecho
  const heading = `# ${label}`
  
  if (trecho.trimStart().startsWith(heading)) return trecho
  return `${heading}\n\n${trecho}`
}


export function stitchTrecho(
  chunks: NoteChunk[],
  matched: string,
  título: string | null | undefined,
  path: string,
  cap: number = STITCH_CAP,
): string {
  const fallback = () => withHeading(matched, título, path)
  if (!Array.isArray(chunks) || chunks.length === 0) return fallback()

  
  const ordered = [...chunks].sort((a, b) => a.chunk_index - b.chunk_index)

  
  const joinAll = ordered.map((c) => c.content).join('\n\n')
  if (joinAll.length <= cap) return withHeading(joinAll, título, path)

  
  let center = ordered.findIndex((c) => c.content === matched)
  if (center < 0) {
    
    return fallback()
  }

  
  let lo = center
  let hi = center
  const windowLen = () => ordered.slice(lo, hi + 1).map((c) => c.content).join('\n\n').length
  let addNext = true 
  while (windowLen() < cap) {
    const canGrowHi = hi < ordered.length - 1
    const canGrowLo = lo > 0
    if (!canGrowHi && !canGrowLo) break
    
    const tryHi = (addNext && canGrowHi) || !canGrowLo
    const nextLo = tryHi ? lo : lo - 1
    const nextHi = tryHi ? hi + 1 : hi
    const candidate = ordered.slice(nextLo, nextHi + 1).map((c) => c.content).join('\n\n')
    if (candidate.length > cap) break 
    lo = nextLo
    hi = nextHi
    addNext = !addNext
  }

  const window = ordered.slice(lo, hi + 1).map((c) => c.content).join('\n\n')
  return withHeading(window, título, path)
}


const MIN_PER_SOURCE = 3


const MULTIHOP_CAP = 6

const NEIGHBOR_RANK = 8


export function scoreItem(it: RankedItem): number {
  if (it.scoreOverride !== undefined) return it.scoreOverride
  return (
    1 / (RRF_K + it.rank) +
    RECENCY_W * it.recency +
    REL_W * (it.relevance ?? 0) +
    (it.canonical ? CANON_BOOST : 0) +
    RERANK_W * (it.rerank ?? 0)
  )
}


export function mergeAndRank(items: RankedItem[], k: number): NotaCitada[] {
  const byId = new Map<string, { note: NotaCitada; score: number }>()
  for (const it of items) {
    const score = scoreItem(it)
    const key = it.note.id || it.note.caminho
    const prev = byId.get(key)
    if (!prev || score > prev.score) byId.set(key, { note: it.note, score })
  }
  
  const sorted = [...byId.values()].sort((a, b) => b.score - a.score).map((x) => x.note)

  const byOrigin = (o: NotaCitada['origem']) => sorted.filter((n) => n.origem === o)
  const notas = byOrigin('nota')
  const episodicos = byOrigin('episodic')

  
  
  if (!notas.length || !episodicos.length || k <= 0) return sorted.slice(0, k)

  
  const reserveN = Math.min(MIN_PER_SOURCE, notas.length, k)
  const reserveE = Math.min(MIN_PER_SOURCE, episodicos.length, k)
  const reserved = new Set<NotaCitada>()
  for (const n of notas.slice(0, reserveN)) reserved.add(n)
  for (const e of episodicos.slice(0, reserveE)) reserved.add(e)

  
  
  const out: NotaCitada[] = sorted.filter((n) => reserved.has(n)).slice(0, k)
  for (const n of sorted) {
    if (out.length >= k) break
    if (!reserved.has(n)) out.push(n)
  }
  return out.slice(0, k)
}

export interface RecallDeps {
  brain?: Brain
  now?: () => number
  
  agentId?: string | null
  
  fetchNotes?: (query: string, k: number) => Promise<NotaCitada[]>
  
  fetchEpisodic?: (query: string, k: number) => Promise<EpisodicHit[]>
  
  touchAccessed?: (ids: string[]) => Promise<void>
  
  registrarSinal?: (linhas: LinhaDeSinal[]) => Promise<unknown>
  
  getTz?: () => Promise<string>
  
  expandGraph?: boolean
  
  neighborProvider?: NeighborProvider
  
  scopes?: string[] | null
  
  excluirCaminho?: (caminho: string) => boolean
  
  rerank?: boolean
  
  pisoEpisodico?: number
}


export async function defaultFetchNotes(brain: Brain, query: string, k: number): Promise<NotaCitada[]> {
  const hits = await brain.search.search(query, k)
  if (!hits.length) return []
  const ids = [...new Set(hits.map((h) => h.note_id))]
  const { data: rows, error } = await brain.db.from('notes').select('id, updated, type, confidence').in('id', ids)
  if (error) throw new Error(`recall fetchNotes select: ${error.message}`)
  const metaById = new Map<string, { updated: string | null; type: string | null }>(
    (rows ?? []).map((r: any) => [r.id, { updated: r.updated ?? null, type: r.type ?? null }]),
  )

  
  const chunksByNote = new Map<string, NoteChunk[]>()
  try {
    const { data: chunkRows, error: chunkErr } = await brain.db
      .from('note_chunks').select('note_id, content, chunk_index').in('note_id', ids)
    if (chunkErr) throw new Error(chunkErr.message)
    for (const r of (chunkRows ?? []) as any[]) {
      const arr = chunksByNote.get(r.note_id) ?? []
      arr.push({ content: r.content, chunk_index: r.chunk_index })
      chunksByNote.set(r.note_id, arr)
    }
  } catch (e) {
    console.warn('[recall] costura de chunks fail-open:', e)
  }

  return hits.map((h) => {
    let agente: string | null = null
    
    
    
    let fonte: string | null | undefined
    try {
      const nota = brain.repo?.readNote(h.path)
      if (nota) { agente = nota.author_agent ?? null; fonte = nota.source ?? null }
    } catch { agente = null }
    const meta = metaById.get(h.note_id)
    
    let trecho: string
    try {
      const chunks = chunksByNote.get(h.note_id)
      trecho = chunks?.length
        ? stitchTrecho(chunks, h.content, h.title, h.path)
        : withHeading(h.content, h.title, h.path)
    } catch {
      trecho = withHeading(h.content, h.title, h.path)
    }
    return {
      id: h.note_id, título: h.title, trecho, caminho: h.path,
      agente, quando: meta?.updated ?? null, origem: 'nota' as const, tipo: meta?.type ?? null, fonte,
    }
  })
}


async function defaultFetchEpisodic(brain: Brain, query: string, k: number, agentId?: string | null): Promise<EpisodicHit[]> {
  const [emb] = await brain.embedder.embedAll([query])
  return searchEpisodic(brain.db, emb, k, agentId ?? null)
}


function episodicToNota(h: EpisodicHit): NotaCitada {
  const dia = (h.created_at ?? '').slice(0, 10)
  return {
    id: h.id,
    título: 'Conversa anterior',
    trecho: h.summary,
    caminho: `recall/${h.conversation_id ?? 'sem-conversa'}-${dia}`,
    agente: null,
    quando: h.created_at ?? null,
    origem: 'episodic',
  }
}


export interface RecallResult {
  notes: NotaCitada[]
  
  degraded: boolean
}


async function preencherFonteFaltante(notas: NotaCitada[], brain: Promise<Brain> | null): Promise<void> {
  const faltando = notas.filter((n) => n.origem === 'nota' && n.fonte === undefined)
  if (!faltando.length || !brain) return
  try {
    const repo = (await brain).repo
    if (!repo) return
    for (const n of faltando) {
      try {
        const lida = repo.readNote(n.caminho)
        if (lida) n.fonte = lida.source ?? null
      } catch {  }
    }
  } catch (e) {
    console.warn('[recall] procedência dos vizinhos fail-open:', e)
  }
}


export async function recall(query: string, k = 8, deps: RecallDeps = {}): Promise<RecallResult> {
  const now = deps.now ?? (() => Date.now())
  let brainPromise: Promise<Brain> | null = null
  const getB = async (): Promise<Brain> => {
    if (deps.brain) return deps.brain
    if (!brainPromise) brainPromise = (await import('../brain/readBrain')).getReadBrain()
    return brainPromise
  }
  
  const brainJaResolvido = (): Promise<Brain> | null => deps.brain ? Promise.resolve(deps.brain) : brainPromise
  const fetchNotes = deps.fetchNotes ?? (async (q, n) => defaultFetchNotes(await getB(), q, n))
  const fetchEpisodic = deps.fetchEpisodic ?? (async (q, n) => defaultFetchEpisodic(await getB(), q, n, deps.agentId))
  const touchAccessed = deps.touchAccessed ?? (async (ids) => { await touchEpisodicAccessed((await getB()).db, ids) })

  
  
  const rerankOn = deps.rerank !== false
  const rr = (note: NotaCitada) =>
    rerankOn ? rerankSignal(query, { título: note.título, trecho: note.trecho }) : undefined

  
  
  
  const pool = poolSize(k)
  let degraded = false
  const [notes, episodic] = await Promise.all([
    fetchNotes(query, pool).catch((e) => { degraded = true; console.warn('[recall] notas fail-open:', e); return [] as NotaCitada[] }),
    fetchEpisodic(query, pool).catch((e) => { degraded = true; console.warn('[recall] episódico fail-open:', e); return [] as EpisodicHit[] }),
  ])

  
  
  
  
  
  
  
  const excluida = (caminho: string) => estaArquivada(caminho) || !!deps.excluirCaminho?.(caminho)
  const notesUsadas = notes.filter((n) => !excluida(n.caminho))

  
  
  
  
  
  
  
  
  
  const pisoEpisodico = deps.pisoEpisodico ?? PISO_DISTANCIA_EPISODICO
  const episodicUsado = episodic.filter((h) => passaNoPiso(h.distance, pisoEpisodico))

  const items: RankedItem[] = []
  notesUsadas.forEach((note, i) =>
    
    
    
    items.push({ note, rank: i, recency: 0, canonical: isCanonicalType(note.tipo), rerank: rr(note) }),
  )
  episodicUsado.forEach((h, i) => {
    
    const t = Date.parse(h.created_at ?? '')
    const ageDays = Number.isFinite(t) ? Math.max(0, (now() - t) / DAY) : Infinity
    
    const recency = Math.max(RECENCY_FLOOR, Math.exp(-ageDays / RECENCY_TAU_DAYS))
    
    
    const relevance = Number.isFinite(h.distance) ? Math.min(1, Math.max(0, 1 - h.distance)) : 0
    items.push({ note: episodicToNota(h), rank: i, recency, relevance })
  })

  
  
  
  
  
  
  
  if (deps.expandGraph !== false && !degraded) {
    
    const anchors = items
      .filter((it) => it.note.origem === 'nota' && it.note.id)
      .map((it) => ({ id: it.note.id, score: scoreItem(it) }))
    if (anchors.length) {
      const existingIds = items.map((it) => it.note.id).filter(Boolean)
      
      
      
      
      try {
        
        
        
        
        let provider = deps.neighborProvider
        if (!provider) {
          const db = (await getB()).db
          provider = combineNeighborProviders(makeEdgeNeighborProvider(db), makeEntityNeighborProvider(db))
        }
        const neighbors = await graphExpand(anchors, provider, existingIds, { scopes: deps.scopes, cap: MULTIHOP_CAP })
        
        
        for (const nb of neighbors) {
          
          
          
          if (excluida(nb.note.caminho)) continue
          items.push({ note: nb.note, rank: NEIGHBOR_RANK, recency: 0, canonical: isCanonicalType(nb.note.tipo), rerank: rr(nb.note) })
        }
      } catch (e) {
        console.warn('[recall] graph-expansion fail-open:', e)
      }
    }
  }

  const ranked = mergeAndRank(items, k)
  await preencherFonteFaltante(ranked, brainJaResolvido())

  const survivingEpisodicIds = ranked.filter((n) => n.origem === 'episodic').map((n) => n.id)
  if (survivingEpisodicIds.length) {
    try { await touchAccessed(survivingEpisodicIds) } catch (e) { console.warn('[recall] touch fail-open:', e) }
  }

  
  
  
  
  
  
  void (async () => {
    const alvos = ranked.map((n) => ({
      tipo: (n.origem === 'episodic' ? 'episodic' : 'nota') as AlvoDoSinal,
      id: n.id,
    }))
    if (!alvos.length) return
    const tz = await (deps.getTz ?? fusoDoDonoMemoizado)()
    const linhas = linhasDeSinal(alvos, query, new Date(now()).toISOString(), tz)
    if (!linhas.length) return
    await (deps.registrarSinal ?? registrarUsoImpl)(linhas)
  })().catch((e) => console.warn('[recall] sinal de uso fail-open:', e))

  return { notes: ranked, degraded }
}
