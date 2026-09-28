

import { INSTAGRAM_MAX_CHARS_COMENTARIO } from './limitesDaMeta'

export interface VariaveisIg {
  
  usuario?: string | null
  
  palavra?: string | null
}

export const VARIAVEIS_DISPONIVEIS = ['usuario', 'palavra'] as const


export function interpolar(texto: string, vars: VariaveisIg): string {
  const mapa: Record<string, string> = {
    usuario: vars.usuario ?? '',
    palavra: vars.palavra ?? '',
  }
  const trocado = texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (inteiro, nome: string) =>
    nome in mapa ? mapa[nome] : inteiro,
  )
  
  
  return trocado.replace(/\s+([,.!?;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim()
}


export const PISO_DO_CORTE_PUBLICO = 0.7


export function textoDaRespostaPublica(bruto: string, vars: VariaveisIg): string {
  const pronto = interpolar(bruto, vars)
  if (pronto.length <= INSTAGRAM_MAX_CHARS_COMENTARIO) return pronto
  const janela = pronto.slice(0, INSTAGRAM_MAX_CHARS_COMENTARIO)
  
  
  
  
  const inteira = janela.trimEnd()
  const piso = Math.floor(inteira.length * PISO_DO_CORTE_PUBLICO)
  const fronteira = Math.max(janela.lastIndexOf(' '), janela.lastIndexOf('\n'))
  
  
  const cortada = fronteira > 0 ? janela.slice(0, fronteira).trimEnd() : ''
  return cortada.length >= piso ? cortada : inteira
}


export function respostaPublicaFoiCortada(bruto: string, vars: VariaveisIg): boolean {
  return interpolar(bruto, vars).length > INSTAGRAM_MAX_CHARS_COMENTARIO
}
