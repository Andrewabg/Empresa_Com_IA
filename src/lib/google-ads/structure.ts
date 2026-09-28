


import { normalizarTexto } from '@/lib/google-ads/text'


export const STAG_MIN = 5

export const STAG_MAX = 20

export type TamanhoGrupo = 'poucas' | 'ok' | 'demais'


export function avaliarTamanhoGrupo(qtdKeywords: number): TamanhoGrupo {
  if (qtdKeywords < STAG_MIN) return 'poucas'
  if (qtdKeywords > STAG_MAX) return 'demais'
  return 'ok'
}


export const NEGATIVAS_UNIVERSAIS: string[] = [
  
  'gratis', 'de graca', 'gratuito', 'gratuita', 'emprego', 'vaga', 'curriculo', 'salario',
  'pdf', 'download', 'apostila', 'curso', 'como fazer', 'o que e',
  'usado', 'reclame aqui', 'reclamacao',
]


export function ehTermoDeMarca(termo: string, marca: string): boolean {
  const m = normalizarTexto(marca).trim()
  if (!m) return false
  
  
  const esc = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|\\s)${esc}(\\s|$)`).test(normalizarTexto(termo))
}
