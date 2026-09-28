


export const ORDEM_DE_PRONUNCIA =
  'Diga exatamente este texto, palavra por palavra, sem comentar nada antes nem depois:'


export function instrucaoParaDizer(texto: string): string | null {
  const limpo = texto.trim()
  if (!limpo) return null
  return `${ORDEM_DE_PRONUNCIA}\n\n${limpo}`
}
