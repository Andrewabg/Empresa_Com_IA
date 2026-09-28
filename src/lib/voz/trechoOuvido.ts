
import { fimDaFrasePorPontuacao } from '@/lib/conversa/fraseCompleta'


export const RITMO_SEMENTE_CPS = 15


const CPS_MIN = 5
const CPS_MAX = 40


export interface RitmoDaFala {
  chars: number
  ms: number
}

export const RITMO_VAZIO: RitmoDaFala = { chars: 0, ms: 0 }


export function aprenderRitmo(estado: RitmoDaFala, chars: number, ms: number): RitmoDaFala {
  if (chars <= 0 || ms <= 0) return estado
  const cps = chars / (ms / 1000)
  if (cps < CPS_MIN || cps > CPS_MAX) return estado
  return { chars: estado.chars + chars, ms: estado.ms + ms }
}


export function ritmoEmCps(estado: RitmoDaFala): number {
  if (estado.ms <= 0 || estado.chars <= 0) return RITMO_SEMENTE_CPS
  const cps = estado.chars / (estado.ms / 1000)
  return Math.min(CPS_MAX, Math.max(CPS_MIN, cps))
}


function fimDeFrase(texto: string, i: number): boolean {
  
  
  if (texto[i] === '\n') return true
  return fimDaFrasePorPontuacao(texto, i) >= 0
}


export function trechoOuvido(texto: string, msOuvidos: number, cps: number): string {
  if (!texto) return ''
  if (msOuvidos <= 0) return ''
  const ritmo = cps > 0 ? cps : RITMO_SEMENTE_CPS
  const estimado = Math.floor((msOuvidos / 1000) * ritmo)
  if (estimado >= texto.length) return texto
  for (let i = estimado; i < texto.length; i += 1) {
    if (fimDeFrase(texto, i)) {
      let j = i + 1
      while (j < texto.length && '"”’\')]'.includes(texto[j])) j += 1
      
      return texto.slice(0, j).trimEnd()
    }
  }
  return texto
}


export interface CorteDeFala {
  messageId: string
  textoOuvido: string
}


export function decidirCorte(entrada: {
  texto: string
  messageId: string | null
  msOuvidos: number
  cps: number
}): CorteDeFala | null {
  const { texto, messageId, msOuvidos, cps } = entrada
  if (!messageId) return null
  const ouvido = trechoOuvido(texto, msOuvidos, cps)
  
  
  
  
  if (!ouvido || ouvido.length >= texto.length) return null
  return { messageId, textoOuvido: ouvido }
}
