
import type { EstudioPatch } from '@/lib/estudio/types'
import type { CriativoView } from '@/lib/design/types'

function ordenar(criativos: CriativoView[]): CriativoView[] {
  return [...criativos].sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}


export function applyCriativoPatch(state: CriativoView[], patch: EstudioPatch): CriativoView[] {
  if (patch.entidade !== 'criativo') return state
  if (patch.op === 'remove') return ordenar(state.filter((c) => c.id !== patch.criativo.id))
  const exists = state.some((c) => c.id === patch.criativo.id)
  const next = exists ? state.map((c) => (c.id === patch.criativo.id ? patch.criativo : c)) : [...state, patch.criativo]
  return ordenar(next)
}
