


export const FORMA_DE_ESCOPO = /^[a-z0-9][a-z0-9/_-]*\/$/


export const ESCOPO_MAX = 120


export function normalizarCaixaEAcento(bruto: string): string {
  return bruto.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}


export function normalizarEscopo(bruto: string): string {
  const base = normalizarCaixaEAcento(bruto).replace(/\/+$/, '')
  return base ? `${base}/` : ''
}


export function escopoAceito(bruto: string): boolean {
  const s = normalizarEscopo(bruto)
  return s.length > 0 && s.length <= ESCOPO_MAX && FORMA_DE_ESCOPO.test(s)
}


export type EscopoDeLeitura =
  | { modo: 'tudo' }
  | { modo: 'filtro'; prefixos: string[] }
  | { modo: 'nada' }


export function escopoDeLeitura(
  scopes: readonly string[] | null | undefined,
  opts?: { exigirForma?: boolean },
): EscopoDeLeitura {
  const declarados = scopes ?? []
  
  if (declarados.length === 0) return { modo: 'tudo' }
  const aceito = opts?.exigirForma ? escopoAceito : (s: string) => normalizarEscopo(s).length > 0
  const prefixos = [...new Set(declarados.filter(aceito).map(normalizarEscopo))]
  if (!prefixos.length) return { modo: 'nada' }
  return { modo: 'filtro', prefixos }
}


export function dentroDoEscopo(path: string, prefixos: readonly string[]): boolean {
  const alvo = (path ?? '').toLowerCase()
  return prefixos.some((p) => alvo.startsWith(p))
}
