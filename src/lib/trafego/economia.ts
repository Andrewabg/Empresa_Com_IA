








export const FATOR_LTV_PADRAO = 1

export interface EntradaEconomia {
  
  ticket?: number
  
  margem?: number
  
  fatorLTV?: number
}

const margemValida = (m?: number): m is number =>
  typeof m === 'number' && Number.isFinite(m) && m > 0 && m <= 1


export function cpaTeto(e: EntradaEconomia): number | null {
  if (typeof e.ticket !== 'number' || !Number.isFinite(e.ticket) || e.ticket <= 0) return null
  if (!margemValida(e.margem)) return null
  const fator = typeof e.fatorLTV === 'number' && Number.isFinite(e.fatorLTV) && e.fatorLTV > 0
    ? e.fatorLTV
    : FATOR_LTV_PADRAO
  return e.ticket * e.margem * fator
}


export function roasBreakeven(margem?: number): number | null {
  return margemValida(margem) ? 1 / margem : null
}
