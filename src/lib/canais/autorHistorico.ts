





export const ROTULO_OPERADOR = '[colega do time respondeu] '

export function rotularAutor(autor: 'contato' | 'agente' | 'operador', texto: string): string {
  if (autor !== 'operador') return texto
  if (!texto.trim()) return texto            
  if (texto.startsWith(ROTULO_OPERADOR)) return texto  
  return `${ROTULO_OPERADOR}${texto}`
}
