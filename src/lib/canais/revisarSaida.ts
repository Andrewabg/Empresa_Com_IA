


export type DecisaoDeSaida =
  | { acao: 'enviar'; texto: string; substituido: boolean }
  | { acao: 'segurar'; motivo: string }


export type ResultadoDoRevisor =
  | { ok: true; valor: unknown }
  | { ok: false; erro: string }

import { temConteudoVisivel } from '@/lib/conteudoVisivel'

export const MOTIVO_FORMATO = 'o revisor de saída devolveu um formato que o sistema não reconhece'
export const MOTIVO_VAZIO = 'o revisor de saída devolveu um texto vazio'
export const MOTIVO_SEM_MOTIVO = 'o revisor de saída pediu para segurar, sem dizer o motivo'

const segurar = (motivo: string): DecisaoDeSaida => ({ acao: 'segurar', motivo })


function ehObjetoDeDados(v: object): boolean {
  if (Array.isArray(v)) return false
  const proto = Object.getPrototypeOf(v) as object | null
  return proto === Object.prototype || proto === null
}

export function decidirSaida(textoOriginal: string, resultado: ResultadoDoRevisor): DecisaoDeSaida {
  if (!resultado.ok) return segurar(resultado.erro)

  const v = resultado.valor
  
  if (v === null || v === undefined) return { acao: 'enviar', texto: textoOriginal, substituido: false }
  if (typeof v !== 'object' || !ehObjetoDeDados(v)) return segurar(MOTIVO_FORMATO)

  const obj = v as Record<string, unknown>

  
  
  
  
  
  
  
  
  
  if ('segurar' in obj) {
    const pedido = obj['segurar']
    
    
    if (pedido !== true) return segurar(MOTIVO_FORMATO)
    const bruto = obj['motivo']
    const motivo = typeof bruto === 'string' ? bruto.trim() : ''
    
    return segurar(temConteudoVisivel(motivo) ? motivo : MOTIVO_SEM_MOTIVO)
  }

  if ('texto' in obj) {
    const bruto = obj['texto']
    if (typeof bruto !== 'string') return segurar(MOTIVO_FORMATO)
    
    
    const texto = bruto.trim()
    return temConteudoVisivel(texto) ? { acao: 'enviar', texto, substituido: true } : segurar(MOTIVO_VAZIO)
  }

  return segurar(MOTIVO_FORMATO)
}
