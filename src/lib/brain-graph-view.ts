
import type { GraphModel } from '@/lib/brain-graph'
import { noteMatches } from '@/lib/brain-nav'
import type { MockNote } from '@/mock/types'

const DAY_MS = 24 * 60 * 60 * 1000


export function neighborsOf(model: GraphModel, id: string): Set<string> {
  const out = new Set<string>([id])
  for (const e of model.edges) {
    if (e.source === id) out.add(e.target)
    else if (e.target === id) out.add(e.source)
  }
  return out
}


export function heroNoteId(notes: MockNote[]): string | null {
  let best: MockNote | null = null
  for (const n of notes) {
    if (!best || n.updatedAt > best.updatedAt || (n.updatedAt === best.updatedAt && n.id < best.id)) {
      best = n
    }
  }
  return best?.id ?? null
}


export function isFresh(updatedAtMs: number, nowMs: number, windowMs = DAY_MS): boolean {
  return nowMs - updatedAtMs <= windowMs && nowMs - updatedAtMs >= -windowMs
}


export function matchingNoteIds(notes: MockNote[], query: string): Set<string> {
  const out = new Set<string>()
  for (const n of notes) if (noteMatches(n, query)) out.add(n.id)
  return out
}



export interface Viewport { scale: number; tx: number; ty: number }
export const ZOOM_MIN = 0.3
export const ZOOM_MAX = 4

export function clampScale(s: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s))
}


export function screenToGraph(sx: number, sy: number, vp: Viewport): { x: number; y: number } {
  return { x: (sx - vp.tx) / vp.scale, y: (sy - vp.ty) / vp.scale }
}




export function breathingOffset(phase01: number, tMs: number, amp: number, speedHz: number): { x: number; y: number } {
  if (amp <= 0) return { x: 0, y: 0 }
  const t = (tMs / 1000) * speedHz * Math.PI * 2
  const a = phase01 * Math.PI * 2
  return { x: Math.cos(a + t) * amp, y: Math.sin(a * 1.3 + t * 0.8) * amp }
}
