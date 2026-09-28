





export const IDADE_MINIMA = 18

export const IDADE_MAXIMA = 65

export class FaixaEtariaInvalidaError extends Error {
  constructor(min: number, max: number) {
    super(`Faixa etaria invalida: ${min}-${max}. Precisa de inteiros entre ${IDADE_MINIMA} e ${IDADE_MAXIMA}, com min menor ou igual a max.`)
    this.name = 'FaixaEtariaInvalidaError'
  }
}

type Targeting = Record<string, unknown>


export function comFaixaEtaria(targeting: Targeting, ageMin: number, ageMax: number): Targeting {
  const valida = (n: number) => Number.isInteger(n) && n >= IDADE_MINIMA && n <= IDADE_MAXIMA
  if (!valida(ageMin) || !valida(ageMax) || ageMin > ageMax) {
    throw new FaixaEtariaInvalidaError(ageMin, ageMax)
  }
  return { ...targeting, age_min: ageMin, age_max: ageMax }
}


export function tetoQueAMetaAceita(targeting: Targeting, tetoPedido: number): number {
  const ta = targeting.targeting_automation as { advantage_audience?: number } | undefined
  return ta?.advantage_audience === 1 && tetoPedido < IDADE_MAXIMA ? IDADE_MAXIMA : tetoPedido
}


export function semAgeRangeLegado(targeting: Targeting): Targeting {
  if (!('age_range' in targeting)) return targeting
  const copia = { ...targeting }
  delete copia.age_range
  return copia
}
