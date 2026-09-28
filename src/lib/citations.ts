

import type { NotaCitada } from '@/server/tools/buscarCerebro'


export function citationsSummary(notes: NotaCitada[]): { count: number; label: string } {
  const count = notes?.length ?? 0
  const label = count === 1 ? 'Fundamentado em 1 memória' : `Fundamentado em ${count} memórias`
  return { count, label }
}


export function formatWhen(at: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(at)) return at
  return `às ${at.slice(11, 16)}`
}


export const CITATION_DISCLOSURE_REVISION = '29GFCJ56GMOM5SKKBIADGCNUHP' as const
