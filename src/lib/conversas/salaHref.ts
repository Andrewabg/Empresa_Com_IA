


export const SALA_MARK_PREFIX = 'awave:conv:'


export const SALA_MARK_NOVA = 'nova'


export function salaMarkKey(slug: string): string {
  return `${SALA_MARK_PREFIX}${slug}`
}


export function hrefParaSala(slug: string, marcador: string | null | undefined): string {
  const base = `/conversa?agent=${encodeURIComponent(slug)}`
  if (!marcador) return base
  if (marcador === SALA_MARK_NOVA) return `${base}&nova=1`
  return `${base}&c=${encodeURIComponent(marcador)}`
}
