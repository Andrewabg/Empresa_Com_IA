
import { normalize, agentName, groupByFolder } from '@/lib/brain-nav'
import type { MockNote } from '@/mock/types'



export type NodeKind = 'core' | 'folder' | 'note'
export type EdgeKind = 'containment' | 'leyline'
export type LeylineReason = 'agent' | 'entity'

export interface GraphNode {
  id: string
  kind: NodeKind
  label: string
  
  folder?: string
  count?: number
  
  noteId?: string
  agentSlug?: string | null
  agentLabel?: string
  path?: string
  updatedAt?: string
  subfolder?: string | null
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  kind: EdgeKind
  weight: number
  reason?: LeylineReason
}

export interface GraphModel {
  nodes: GraphNode[]
  edges: GraphEdge[]
}



export const GRAPH_CONST = {
  
  LEYLINE_CAP: 3,
  ENTITY_MIN_LEN: 4,
  WEIGHT_CONTAINMENT: 1,
  WEIGHT_LEYLINE: 0.5,
  
  ITERATIONS: 300,
  ALPHA0: 1,
  COOLING: 0.985,
  REPULSION: 16000,
  SPRING_K_CONTAINMENT: 0.075,
  SPRING_K_LEYLINE: 0.02,
  REST_FOLDER_CORE: 250,
  REST_NOTE_FOLDER: 150,
  REST_LEYLINE: 180,
  GRAVITY: 0.012,
  GRAVITY_HUB: 0.05,
  VIEW_HALF: 500,
  VIEW_MARGIN: 0.08,
  MIN_DIST: 4,
  
  
  
  
  
  MAX_STEP: 40,
} as const


export const STOPWORDS_PT = new Set<string>([
  'para', 'como', 'pelo', 'pela', 'pelos', 'pelas', 'mais', 'menos', 'esta',
  'este', 'isso', 'essa', 'esse', 'sobre', 'entre', 'cada', 'onde', 'quando',
  'porque', 'sendo', 'foram', 'sera', 'seria', 'aqui', 'toda', 'todo', 'todos',
  'todas', 'muito', 'muita', 'suas', 'seus', 'nossa', 'nosso', 'tambem',
  'depois', 'antes', 'ainda', 'apenas', 'outro', 'outra', 'feito', 'feita',
  'pode', 'devem', 'deve', 'sua', 'seu', 'uma', 'uns', 'umas',
])



export const CORE_ID = 'core'
export const folderNodeId = (folder: string) => `folder:${folder}`
export const noteNodeId = (noteId: string) => `note:${noteId}`




export function subfolderOf(path: string): string | null {
  const parts = path.replace(/^\/+/, '').split('/')
  return parts.length >= 3 ? parts[1] : null
}


export function fileStem(path: string): string {
  const last = path.replace(/^\/+/, '').split('/').pop() ?? ''
  return last.replace(/\.[^.]+$/, '')
}


export function salientTokens(n: MockNote): Set<string> {
  const text = normalize(`${n.title} ${n.snippet} ${fileStem(n.path)}`)
  const out = new Set<string>()
  for (const tok of text.split(/[^a-z0-9]+/)) {
    if (tok.length < GRAPH_CONST.ENTITY_MIN_LEN) continue
    if (/^[0-9]+$/.test(tok)) continue
    if (STOPWORDS_PT.has(tok)) continue
    out.add(tok)
  }
  return out
}


export function buildBrainGraph(notes: MockNote[]): GraphModel {
  const nodes: GraphNode[] = [{ id: CORE_ID, kind: 'core', label: 'Cérebro' }]
  const edges: GraphEdge[] = []
  const groups = groupByFolder(notes) 

  
  for (const grp of groups) {
    nodes.push({
      id: folderNodeId(grp.folder),
      kind: 'folder',
      label: grp.folder,
      folder: grp.folder,
      count: grp.notes.length,
    })
    edges.push({
      id: `c|${folderNodeId(grp.folder)}|${CORE_ID}`,
      source: folderNodeId(grp.folder),
      target: CORE_ID,
      kind: 'containment',
      weight: GRAPH_CONST.WEIGHT_CONTAINMENT,
    })
  }

  
  for (const grp of groups) {
    for (const n of grp.notes) {
      nodes.push({
        id: noteNodeId(n.id),
        kind: 'note',
        label: n.title,
        noteId: n.id,
        agentSlug: n.author_agent,
        agentLabel: n.author_agent ? agentName(n.author_agent) : 'agente desconhecido',
        path: n.path,
        updatedAt: n.updatedAt,
        subfolder: subfolderOf(n.path),
      })
      edges.push({
        id: `c|${noteNodeId(n.id)}|${folderNodeId(grp.folder)}`,
        source: noteNodeId(n.id),
        target: folderNodeId(grp.folder),
        kind: 'containment',
        weight: GRAPH_CONST.WEIGHT_CONTAINMENT,
      })
    }
  }

  edges.push(...leylines(notes))
  return { nodes, edges }
}

interface Candidate {
  a: string 
  b: string
  score: number 
  reason: LeylineReason
}


function leylines(notes: MockNote[]): GraphEdge[] {
  const tokensById = new Map<string, Set<string>>()
  for (const n of notes) tokensById.set(n.id, salientTokens(n))

  
  const cands: Candidate[] = []
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const ni = notes[i]
      const nj = notes[j]
      const ti = tokensById.get(ni.id)!
      const tj = tokensById.get(nj.id)!
      let shared = 0
      for (const t of ti) if (tj.has(t)) shared++
      const sameAgent = ni.author_agent != null && ni.author_agent === nj.author_agent
      if (shared === 0 && !sameAgent) continue
      const a = noteNodeId(ni.id)
      const b = noteNodeId(nj.id)
      const [lo, hi] = a < b ? [a, b] : [b, a]
      cands.push({
        a: lo,
        b: hi,
        score: shared + (sameAgent ? 1 : 0),
        reason: shared > 0 ? 'entity' : 'agent',
      })
    }
  }

  
  const incident = new Map<string, Candidate[]>()
  for (const c of cands) {
    ;(incident.get(c.a) ?? incident.set(c.a, []).get(c.a)!).push(c)
    ;(incident.get(c.b) ?? incident.set(c.b, []).get(c.b)!).push(c)
  }
  const topKByNode = new Map<string, Set<string>>() 
  for (const [nodeId, list] of incident) {
    list.sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score
      const ox = x.a === nodeId ? x.b : x.a
      const oy = y.a === nodeId ? y.b : y.a
      return ox.localeCompare(oy)
    })
    const keep = new Set<string>()
    for (const c of list.slice(0, GRAPH_CONST.LEYLINE_CAP)) keep.add(`${c.a}|${c.b}`)
    topKByNode.set(nodeId, keep)
  }

  
  const out: GraphEdge[] = []
  const emitted = new Set<string>()
  
  cands.sort((x, y) => `${x.a}|${x.b}`.localeCompare(`${y.a}|${y.b}`))
  for (const c of cands) {
    const key = `${c.a}|${c.b}`
    if (emitted.has(key)) continue
    if (topKByNode.get(c.a)?.has(key) && topKByNode.get(c.b)?.has(key)) {
      emitted.add(key)
      out.push({
        id: `l|${c.a}|${c.b}`,
        source: c.a,
        target: c.b,
        kind: 'leyline',
        weight: GRAPH_CONST.WEIGHT_LEYLINE,
        reason: c.reason,
      })
    }
  }
  return out
}




function arredondar(v: number): number {
  return Math.round(v * 1000) / 1000
}

export interface PositionedNode extends GraphNode {
  x: number
  y: number
  phase: number 
}
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }
export interface PositionedGraph {
  nodes: PositionedNode[]
  edges: GraphEdge[]
  bounds: Bounds
}


function hash32(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function unit01(id: string, salt: string): number {
  return (hash32(`${id}|${salt}`) % 1_000_000) / 1_000_000
}


export function layoutGraph(model: GraphModel): PositionedGraph {
  const C = GRAPH_CONST
  const idx = new Map(model.nodes.map((n, i) => [n.id, i]))
  const N = model.nodes.length
  const px = new Float64Array(N)
  const py = new Float64Array(N)
  const isHub = model.nodes.map((n) => n.kind === 'core' || n.kind === 'folder')

  
  const folders = model.nodes.filter((n) => n.kind === 'folder')
  const folderAngle = new Map<string, number>()
  folders.forEach((f, i) => folderAngle.set(f.id, (2 * Math.PI * i) / Math.max(folders.length, 1)))

  
  model.nodes.forEach((n, i) => {
    if (n.kind === 'core') {
      px[i] = 0; py[i] = 0
    } else if (n.kind === 'folder') {
      const a = folderAngle.get(n.id)! + (unit01(n.id, 'a') - 0.5) * 0.4
      const r = C.REST_FOLDER_CORE * (0.85 + unit01(n.id, 'r') * 0.3)
      px[i] = Math.cos(a) * r; py[i] = Math.sin(a) * r
    } else {
      
      const fEdge = model.edges.find((e) => e.kind === 'containment' && e.source === n.id)
      const base = fEdge ? folderAngle.get(fEdge.target) ?? 0 : 0
      const a = base + (unit01(n.id, 'a') - 0.5) * 1.1
      const r = C.REST_FOLDER_CORE + C.REST_NOTE_FOLDER * (0.5 + unit01(n.id, 'r') * 1.0)
      px[i] = Math.cos(a) * r; py[i] = Math.sin(a) * r
    }
  })

  
  const restOf = (e: GraphEdge): number => {
    if (e.kind === 'leyline') return C.REST_LEYLINE
    
    const s = model.nodes[idx.get(e.source)!]
    const t = model.nodes[idx.get(e.target)!]
    const involvesCore = s.kind === 'core' || t.kind === 'core'
    return involvesCore ? C.REST_FOLDER_CORE : C.REST_NOTE_FOLDER
  }
  const kOf = (e: GraphEdge) => (e.kind === 'containment' ? C.SPRING_K_CONTAINMENT : C.SPRING_K_LEYLINE)

  let alpha = C.ALPHA0
  for (let iter = 0; iter < C.ITERATIONS; iter++) {
    const fx = new Float64Array(N)
    const fy = new Float64Array(N)

    
    
    
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = px[i] - px[j]
        let dy = py[i] - py[j]
        let real = Math.hypot(dx, dy)
        if (real < 1e-6) {
          
          const ang = (unit01(model.nodes[i].id, 'sep') + unit01(model.nodes[j].id, 'sep')) * Math.PI
          dx = Math.cos(ang) * 1e-3
          dy = Math.sin(ang) * 1e-3
          real = 1e-3
        }
        const d = real < C.MIN_DIST ? C.MIN_DIST : real
        const f = C.REPULSION / (d * d)
        const ux = dx / real
        const uy = dy / real
        fx[i] += ux * f; fy[i] += uy * f
        fx[j] -= ux * f; fy[j] -= uy * f
      }
    }
    
    for (const e of model.edges) {
      const si = idx.get(e.source)!
      const ti = idx.get(e.target)!
      let dx = px[ti] - px[si]
      let dy = py[ti] - py[si]
      let d = Math.hypot(dx, dy)
      if (d < 1e-6) d = 1e-6
      const f = kOf(e) * (d - restOf(e))
      const ux = dx / d
      const uy = dy / d
      fx[si] += ux * f; fy[si] += uy * f
      fx[ti] -= ux * f; fy[ti] -= uy * f
    }
    
    for (let i = 0; i < N; i++) {
      const g = isHub[i] ? C.GRAVITY_HUB : C.GRAVITY
      fx[i] -= px[i] * g
      fy[i] -= py[i] * g
      if (model.nodes[i].kind === 'core') continue 
      let mx = fx[i] * alpha
      let my = fy[i] * alpha
      const passo = Math.hypot(mx, my)
      if (passo > C.MAX_STEP) {
        mx = (mx / passo) * C.MAX_STEP
        my = (my / passo) * C.MAX_STEP
      }
      px[i] += mx
      py[i] += my
    }
    alpha *= C.COOLING
  }

  
  
  
  
  let maxR = 1
  for (let i = 0; i < N; i++) maxR = Math.max(maxR, Math.hypot(px[i], py[i]))
  const scale = (C.VIEW_HALF * (1 - C.VIEW_MARGIN)) / maxR

  const nodes: PositionedNode[] = model.nodes.map((n, i) => ({
    ...n,
    x: arredondar(px[i] * scale),
    y: arredondar(py[i] * scale),
    phase: unit01(n.id, 'phase'),
  }))
  const bounds: Bounds = {
    minX: Math.min(...nodes.map((n) => n.x)),
    minY: Math.min(...nodes.map((n) => n.y)),
    maxX: Math.max(...nodes.map((n) => n.x)),
    maxY: Math.max(...nodes.map((n) => n.y)),
  }
  return { nodes, edges: model.edges, bounds }
}
