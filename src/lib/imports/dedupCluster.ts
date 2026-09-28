

import { normalizar } from './dedup'
import { tokenizar } from '@/lib/text'

export interface CandItem { id: number; titulo: string; corpo: string; tipo: string | null; tags: string[]; status: string }


export function normalizarTitulo(titulo: string): string {
  return normalizar(titulo)
}


function prefixoDePalavra(a: string, b: string): boolean {
  if (a === b) return true
  return b.length > a.length && b.startsWith(a + ' ')
}


export function clusterizar(cands: CandItem[]): { clusters: CandItem[][]; singletons: CandItem[] } {
  const titulos = cands.map((c) => normalizarTitulo(c.titulo))
  const grupo = cands.map((_, i) => i) 
  const acha = (i: number): number => (grupo[i] === i ? i : (grupo[i] = acha(grupo[i])))
  for (let i = 0; i < cands.length; i++) {
    for (let j = i + 1; j < cands.length; j++) {
      if (prefixoDePalavra(titulos[i], titulos[j]) || prefixoDePalavra(titulos[j], titulos[i])) {
        grupo[acha(j)] = acha(i)
      }
    }
  }
  const porRep = new Map<number, CandItem[]>()
  for (let i = 0; i < cands.length; i++) {
    const r = acha(i)
    if (!porRep.has(r)) porRep.set(r, [])
    porRep.get(r)!.push(cands[i])
  }
  const clusters: CandItem[][] = []
  const singletons: CandItem[] = []
  for (const g of porRep.values()) {
    if (g.length >= 2) clusters.push(g)
    else singletons.push(...g)
  }
  return { clusters, singletons }
}


function numeros(corpo: string): string[] {
  return corpo.match(/\d[\d.,/-]*\d|\d/g) ?? []
}


export function subconjuntoDe(aBody: string, bBody: string): boolean {
  const bTokens = new Set(tokenizar(bBody))
  const aTokens = tokenizar(aBody)
  if (aTokens.length === 0) return false 
  if (!aTokens.every((t) => bTokens.has(t))) return false
  return numeros(aBody).every((n) => bBody.includes(n))
}
