


export const TRECHO_MAX = 160


const FRONTEIRA_MINIMA = 0.6

export interface TrechoDaNota {
  
  texto: string
  
  cortado: boolean
}


function ultimaFronteira(s: string): number {
  return Math.max(s.lastIndexOf(' '), s.lastIndexOf('\n'), s.lastIndexOf('\t'))
}


export function trechoDaNota(bruto: string, max: number = TRECHO_MAX): TrechoDaNota {
  const texto = bruto.trimEnd()
  if (texto.length <= max) return { texto, cortado: false }

  const limite = texto.slice(0, max)
  const fronteira = ultimaFronteira(limite)
  const recortado = fronteira >= Math.floor(max * FRONTEIRA_MINIMA) ? limite.slice(0, fronteira) : limite

  
  return { texto: `${recortado.replace(/[\s,;:]+$/, '')}…`, cortado: true }
}
