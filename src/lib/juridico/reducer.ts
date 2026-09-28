
import type { ContratoView, JuridicoPatch } from '@/lib/juridico/types'

function ordenar(cs: ContratoView[]): ContratoView[] {
  
  return [...cs].sort((a, b) =>
    (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))
}

export function applyJuridicoPatch(state: ContratoView[], patch: JuridicoPatch): ContratoView[] {
  if (patch.entidade !== 'contrato') return state 
  if (patch.op === 'remove') return ordenar(state.filter((c) => c.id !== patch.contrato.id))
  const exists = state.some((c) => c.id === patch.contrato.id)
  const next = exists ? state.map((c) => (c.id === patch.contrato.id ? patch.contrato : c)) : [...state, patch.contrato]
  return ordenar(next)
}
