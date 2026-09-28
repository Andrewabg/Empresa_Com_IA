


export type VerticalBr =
  | 'advocacia' | 'contabilidade' | 'educacao' | 'odontologia'
  | 'imobiliaria' | 'servicos_locais' | 'saude' | 'ecommerce' | 'generico'

export interface FaixaCpc { min: number; max: number }

export const CPC_BR: Record<VerticalBr, FaixaCpc> = {
  advocacia: { min: 12, max: 25 },
  contabilidade: { min: 8, max: 30 },
  educacao: { min: 8, max: 20 },
  odontologia: { min: 4, max: 9 },
  imobiliaria: { min: 5, max: 10 },
  servicos_locais: { min: 4, max: 8 },
  saude: { min: 3, max: 8 },
  ecommerce: { min: 1.5, max: 3.5 },
  generico: { min: 1.5, max: 30 },
}

export type NivelCpc = 'abaixo' | 'normal' | 'acima'


export function avaliarCpc(cpc: number, vertical: VerticalBr): NivelCpc | 'indefinido' {
  if (vertical === 'generico') return 'indefinido'
  const faixa = CPC_BR[vertical]
  if (cpc < faixa.min) return 'abaixo'
  if (cpc > faixa.max) return 'acima'
  return 'normal'
}
