


export interface SalaCandidata {
  slug: string
  roster: boolean
}


export const SLUGS_INFRA: readonly string[] = ['curator-agent', 'architect']


const SLUG_PRIMARIO = 'jarvis'


export function salasVisiveis<T extends SalaCandidata>(crew: readonly T[], activeId: string): T[] {
  const visivel = (m: T) => !SLUGS_INFRA.includes(m.slug) && (m.roster || m.slug === activeId)
  const filtrada = crew.filter(visivel)
  const primario = filtrada.find((m) => m.slug === SLUG_PRIMARIO)
  if (!primario) return filtrada
  return [primario, ...filtrada.filter((m) => m.slug !== SLUG_PRIMARIO)]
}
