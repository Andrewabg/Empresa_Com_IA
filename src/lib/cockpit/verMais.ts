


export const TETO_FEED_AO_VIVO = 6


export const TETO_FILA_DE_DECISAO = 4


export const PASSO_VER_MAIS = 10


export function fatiaVisivel<T>(
  itens: readonly T[],
  mostrando: number,
): { visiveis: T[]; restantes: number } {
  const limite = Number.isFinite(mostrando) && mostrando >= 1 ? Math.floor(mostrando) : 1
  const visiveis = itens.slice(0, limite)
  return { visiveis, restantes: Math.max(0, itens.length - visiveis.length) }
}


export function rotuloVerMais(restantes: number, passo: number = PASSO_VER_MAIS): string {
  if (!Number.isFinite(restantes) || restantes <= 0) return ''
  const p = Number.isFinite(passo) && passo >= 1 ? Math.floor(passo) : 1
  return `Ver mais ${Math.min(Math.floor(restantes), p)}`
}


export function rotuloRestantes(restantes: number, substantivo: [string, string]): string {
  if (!Number.isFinite(restantes) || restantes <= 0) return ''
  const n = Math.floor(restantes)
  return n === 1 ? `Mais 1 ${substantivo[0]}` : `Mais ${n} ${substantivo[1]}`
}
