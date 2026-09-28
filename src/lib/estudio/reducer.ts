
import type { PecaView, EstudioPatch, SwipeView, CampanhaView } from '@/lib/estudio/types'

function ordenar(pecas: PecaView[]): PecaView[] {
  return [...pecas].sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function applyEstudioPatch(state: PecaView[], patch: EstudioPatch): PecaView[] {
  if (patch.entidade !== 'peca') return state 
  if (patch.op === 'remove') return ordenar(state.filter((p) => p.id !== patch.peca.id))
  const exists = state.some((p) => p.id === patch.peca.id)
  const next = exists ? state.map((p) => (p.id === patch.peca.id ? patch.peca : p)) : [...state, patch.peca]
  return ordenar(next)
}

function ordenarSwipes(swipes: SwipeView[]): SwipeView[] {
  
  return [...swipes].sort((a, b) =>
    (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))
}


export function applySwipePatch(state: SwipeView[], patch: EstudioPatch): SwipeView[] {
  if (patch.entidade !== 'swipe') return state
  if (patch.op === 'remove') return ordenarSwipes(state.filter((s) => s.id !== patch.swipe.id))
  const exists = state.some((s) => s.id === patch.swipe.id)
  const next = exists ? state.map((s) => (s.id === patch.swipe.id ? patch.swipe : s)) : [...state, patch.swipe]
  return ordenarSwipes(next)
}

function ordenarCampanhas(campanhas: CampanhaView[]): CampanhaView[] {
  
  return [...campanhas].sort((a, b) =>
    (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))
}


export function applyCampanhaPatch(state: CampanhaView[], patch: EstudioPatch): CampanhaView[] {
  if (patch.entidade !== 'campanha') return state
  if (patch.op === 'remove') return ordenarCampanhas(state.filter((c) => c.id !== patch.campanha.id))
  const exists = state.some((c) => c.id === patch.campanha.id)
  const next = exists ? state.map((c) => (c.id === patch.campanha.id ? patch.campanha : c)) : [...state, patch.campanha]
  return ordenarCampanhas(next)
}
