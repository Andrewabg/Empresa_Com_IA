




import type { BlocoType, PainelBloco, PainelBlocoPatch } from '@/lib/trafego/types'


export interface OrdenavelNoPainel {
  id: string
  type: BlocoType
  position: number
  created_at?: string
}


export function compararBlocos(a: OrdenavelNoPainel, b: OrdenavelNoPainel): number {
  if (a.position !== b.position) return a.position - b.position
  const notaA = a.type === 'note'
  const notaB = b.type === 'note'
  if (notaA !== notaB) return notaA ? 1 : -1
  const criadoA = a.created_at ?? ''
  const criadoB = b.created_at ?? ''
  const porCriacao = criadoA < criadoB ? -1 : criadoA > criadoB ? 1 : 0
  if (porCriacao !== 0) return notaA ? -porCriacao : porCriacao
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function ordenar(blocos: PainelBloco[]): PainelBloco[] {
  return [...blocos].sort(compararBlocos)
}

export function applyPatch(state: PainelBloco[], patch: PainelBlocoPatch): PainelBloco[] {
  if (patch.op === 'remove') {
    const id = patch.bloco.id
    return ordenar(state.filter((b) => b.id !== id))
  }
  
  const exists = state.some((b) => b.id === patch.bloco.id)
  const next = exists
    ? state.map((b) => (b.id === patch.bloco.id ? patch.bloco : b))
    : [...state, patch.bloco]
  return ordenar(next)
}
