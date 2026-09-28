
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')


export function normalizarTexto(texto: string): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .trim()
}


export function palavrasDe(texto: string): string[] {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}
