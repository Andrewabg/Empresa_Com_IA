import type { Profundidade } from './types'


export function pisoProfundidade(texto: string): Profundidade {
  const t = (texto ?? '').trim()
  if (t.length < 12) return 0
  const palavras = t.split(/\s+/).length
  const temNumero = /\d/.test(t)
  const temEspecifico = /[A-ZÁÉÍÓÚ][a-zà-ú]{2,}|,|;|\bR\$|%/.test(t) 
  let score = 0
  if (palavras >= 6) score++
  if (palavras >= 15) score++
  if (temNumero) score++
  if (temEspecifico) score++
  return Math.min(3, score) as Profundidade
}
