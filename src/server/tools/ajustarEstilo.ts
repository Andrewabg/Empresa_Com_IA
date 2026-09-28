import { clampDial, type StyleProfile, type StyleDials, type DialName, DIAL_NAMES } from '@/lib/style'
import { getStyleProfile, saveStyleProfile } from '@/data/operatorStyle'

export interface StyleAdjustment {
  dials?: Partial<Record<DialName, number>>
  notas?: string
  motivo: string
}


export function mergeAdjustment(current: StyleProfile, adj: StyleAdjustment, now: string): StyleProfile {
  const dials: StyleDials = { ...current.dials }
  if (adj.dials) {
    for (const d of DIAL_NAMES) {
      const v = adj.dials[d]
      if (typeof v === 'number') dials[d] = clampDial(v)
    }
  }
  return {
    ...current,
    dials,
    notas: typeof adj.notas === 'string' ? adj.notas : current.notas,
    lastChange: { source: 'explicito', resumo: adj.motivo, at: now },
  }
}


export async function applyStyleAdjustment(operatorId: string, adj: StyleAdjustment): Promise<StyleProfile> {
  const current = await getStyleProfile(operatorId)
  const next = mergeAdjustment(current, adj, new Date().toISOString())
  await saveStyleProfile(operatorId, {
    dials: next.dials, notas: next.notas, learningPaused: next.learningPaused, lastChange: next.lastChange,
  })
  return next
}
