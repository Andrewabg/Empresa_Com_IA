
import { fillerDeFerramenta, FILLER_VAZIO } from './fillerDeFerramenta'


export const INTERVALO_DA_CADENCIA_MS = 45_000

export interface EstadoDaCadencia {
  
  readonly turno: string | null
  
  readonly ultimaFalaMs: number | null
  
  readonly falouPlano: boolean
}

export const CADENCIA_VAZIA: EstadoDaCadencia = { turno: null, ultimaFalaMs: null, falouPlano: false }

const FRASE_PLANO = 'Vou olhar isso com calma, uns minutos. Vou te contando.'


const TERMINACAO_DE_FRASE = /[.?!]$/


function fraseDoDetalhe(detalhe: string): string {
  const minusculo = detalhe.toLowerCase()
  const comInicial = minusculo.charAt(0).toUpperCase() + minusculo.slice(1)
  return TERMINACAO_DE_FRASE.test(comInicial) ? comInicial : `${comInicial}.`
}


function fraseDoContador(contador: string): string {
  const corpo = contador.toLowerCase().replace(/\s*·\s*/, ' e ')
  return `Já foram ${corpo}.`
}


function fraseEmCurso(f: { detalhe?: string; contador?: string }): string | null {
  if (f.detalhe) return fraseDoDetalhe(f.detalhe)
  if (f.contador) return fraseDoContador(f.contador)
  return null
}


export function cadenciaDaInvestigacao(
  estado: EstadoDaCadencia,
  f: { tool: string; detalhe?: string; contador?: string },
  turno: string,
  agoraMs: number,
): { estado: EstadoDaCadencia; frase: string | null } {
  const temInvestigacao = Boolean(f.detalhe) || Boolean(f.contador)

  if (estado.turno !== turno) {
    if (temInvestigacao) {
      return { estado: { turno, ultimaFalaMs: agoraMs, falouPlano: true }, frase: FRASE_PLANO }
    }
    const frase = fillerDeFerramenta(FILLER_VAZIO, f.tool, turno).frase
    return { estado: { turno, ultimaFalaMs: agoraMs, falouPlano: false }, frase }
  }

  if (!estado.falouPlano) {
    
    
    
    
    
    
    if (temInvestigacao) {
      return { estado: { ...estado, ultimaFalaMs: agoraMs, falouPlano: true }, frase: FRASE_PLANO }
    }
    return { estado, frase: null }
  }

  if (estado.ultimaFalaMs !== null && agoraMs - estado.ultimaFalaMs < INTERVALO_DA_CADENCIA_MS) {
    return { estado, frase: null }
  }

  const frase = fraseEmCurso(f)
  if (!frase) return { estado, frase: null }
  return { estado: { ...estado, ultimaFalaMs: agoraMs }, frase }
}
