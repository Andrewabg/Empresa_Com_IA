


export const CHAVE_RECOLHIDOS = 'rail:recolhidos'


export interface GrupoNavegavel {
  label?: string
  items: { href: string }[]
}


export function podeRecolher(grupo: GrupoNavegavel): boolean {
  return typeof grupo.label === 'string' && grupo.label.length > 0
}


export function contemRotaAtual(grupo: GrupoNavegavel, pathname: string): boolean {
  return grupo.items.some((i) => i.href === pathname)
}


export function grupoAberto(
  grupo: GrupoNavegavel,
  recolhidos: ReadonlySet<string>,
  pathname: string,
): boolean {
  if (!podeRecolher(grupo)) return true
  if (contemRotaAtual(grupo, pathname)) return true
  return !recolhidos.has(grupo.label as string)
}


export function alternarRecolhido(
  recolhidos: ReadonlySet<string>,
  label: string,
): Set<string> {
  const proximo = new Set(recolhidos)
  if (proximo.has(label)) proximo.delete(label)
  else proximo.add(label)
  return proximo
}


export function lerRecolhidos(cru: string | null | undefined): Set<string> {
  if (typeof cru !== 'string' || !cru) return new Set()
  try {
    const parsed: unknown = JSON.parse(cru)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string' && x.length > 0))
  } catch {
    return new Set()
  }
}


export function gravarRecolhidos(recolhidos: ReadonlySet<string>): string {
  return JSON.stringify([...recolhidos].sort())
}


export function rotuloDoBotao(label: string, aberto: boolean): string {
  return `${aberto ? 'Recolher' : 'Abrir'} a seção ${label}`
}


export function seloVaiNoCabecalho(
  grupo: GrupoNavegavel,
  aberto: boolean,
  hrefComSelo: string,
  temSelo: boolean,
): boolean {
  if (aberto || !temSelo) return false
  return grupo.items.some((i) => i.href === hrefComSelo)
}
