
const MAX_PALAVRAS = 6
const MAX_CHARS = 48

export function tituloProvisorio(userText: string): string {
  const primeiraLinha = (userText ?? '').split('\n')[0] ?? ''
  const limpo = primeiraLinha.replace(/\s+/g, ' ').trim()
  if (!limpo) return ''
  const palavras = limpo.split(' ')
  let t = palavras.slice(0, MAX_PALAVRAS).join(' ')
  const truncouPorPalavra = palavras.length > MAX_PALAVRAS
  if (t.length > MAX_CHARS) {
    t = t.slice(0, MAX_CHARS).trimEnd() + '…'
  } else if (truncouPorPalavra) {
    t = t + '…'
  }
  return t
}
