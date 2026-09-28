






import { getFormato, normalizarSlugDeFormato, slugsDeFormato } from './formatos'


export type Quantidades = Record<string, number>


export const MAX_POR_FORMATO = 12

const inteiro = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim())
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_POR_FORMATO, Math.floor(n)) : null
}


export function lerQuantidades(brief: Record<string, unknown> | undefined): Quantidades {
  const cru = brief?.quantidades
  const out: Quantidades = {}
  if (!cru || typeof cru !== 'object' || Array.isArray(cru)) return out
  for (const [k, v] of Object.entries(cru as Record<string, unknown>)) {
    const slug = normalizarSlugDeFormato(k)
    const n = inteiro(v)
    if (n && getFormato(slug)) out[slug] = n
  }
  return out
}


export function totalPedido(q: Quantidades): number {
  return Object.values(q).reduce((a, b) => a + b, 0)
}

export interface ConferenciaDoPlano<T> {
  
  plano: T[]
  
  faltas: string[]
  
  cortadas: string[]
}


export function conferirPlanoContraPedido<T extends { formato: string }>(
  plano: T[], pedido: Quantidades,
): ConferenciaDoPlano<T> {
  const itens = plano ?? []
  if (!totalPedido(pedido)) return { plano: itens, faltas: [], cortadas: [] }

  const usados: Record<string, number> = {}
  const mantidos: T[] = []
  const cortadas: string[] = []
  for (const item of itens) {
    const slug = normalizarSlugDeFormato(item.formato)
    const teto = pedido[slug]
    if (teto === undefined) {
      
      
      cortadas.push(nomeDoFormato(slug))
      continue
    }
    const usado = usados[slug] ?? 0
    if (usado >= teto) { cortadas.push(nomeDoFormato(slug)); continue }
    usados[slug] = usado + 1
    mantidos.push(item)
  }

  const faltas: string[] = []
  for (const [slug, n] of Object.entries(pedido)) {
    const feitas = usados[slug] ?? 0
    if (feitas < n) faltas.push(`${nomeDoFormato(slug)}: ${feitas} de ${n}`)
  }
  return { plano: mantidos, faltas, cortadas }
}

function nomeDoFormato(slug: string): string {
  return getFormato(slug)?.nome ?? slug
}


export function renderQuantidades(q: Quantidades): string {
  const linhas = Object.entries(q).map(([slug, n]) => `- ${n} de ${nomeDoFormato(slug)} (slug ${slug})`)
  return linhas.join('\n')
}


export function slugsPermitidos(): string[] { return slugsDeFormato() }
