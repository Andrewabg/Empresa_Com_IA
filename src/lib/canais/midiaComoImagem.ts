







const KINDS_COMO_IMAGEM = new Set(['image', 'sticker'])

export function ehMidiaComoImagem(kind: string): boolean {
  return KINDS_COMO_IMAGEM.has(kind)
}
