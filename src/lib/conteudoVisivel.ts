



const INVISIVEIS = /[\p{Cf}\p{Cc}]/gu


export function temConteudoVisivel(valor: unknown): boolean {
  if (typeof valor !== 'string') return false
  return valor.replace(INVISIVEIS, '').trim().length > 0
}
