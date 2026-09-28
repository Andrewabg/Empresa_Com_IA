

import { INSTAGRAM_MAX_CHARS_COMENTARIO } from './limitesDaMeta'

export type ModoCasamento = 'contem' | 'exata' | 'exata_normalizada'


export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    
    
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') 
    .replace(/\s+/g, ' ')
    .trim()
}


export function palavraForaDoTeto(palavra: string): boolean {
  return palavra.length > INSTAGRAM_MAX_CHARS_COMENTARIO
}


export function temPalavraForaDoTeto(palavras: readonly string[]): boolean {
  return palavras.some((p) => palavraForaDoTeto(p))
}


export function automacaoMudaPorPalavras(palavras: readonly string[]): boolean {
  return palavras.length > 0 && palavras.every((p) => palavraForaDoTeto(p))
}


function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}


export function casarPalavraChave(
  texto: string,
  palavras: readonly string[],
  modo: ModoCasamento,
): string | null {
  if (!texto.trim()) return null
  const alvoNormalizado = normalizar(texto)

  for (const palavra of palavras) {
    if (!palavra.trim()) continue 
    
    
    
    
    
    
    
    
    
    
    if (palavraForaDoTeto(palavra)) continue
    if (modo === 'exata') {
      if (texto === palavra) return palavra
      continue
    }
    const p = normalizar(palavra)
    if (!p) continue
    if (modo === 'exata_normalizada') {
      if (alvoNormalizado === p) return palavra
      continue
    }
    const re = new RegExp(`(?:^|\\s)${escapar(p)}(?:\\s|$)`, 'u')
    if (re.test(alvoNormalizado)) return palavra
  }
  return null
}
