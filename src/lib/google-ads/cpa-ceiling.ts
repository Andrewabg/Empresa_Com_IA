


export interface CpaTetoInput {
  
  ticket: number
  
  margem: number
  
  fatorLtv?: number
}


export function cpaTeto(input: CpaTetoInput): number | null {
  const { ticket, margem, fatorLtv = 1 } = input
  if (ticket <= 0 || margem <= 0 || margem > 1 || fatorLtv <= 0) return null
  return ticket * margem * fatorLtv
}

export type VerdictoCpa = 'lucrativo' | 'no_limite' | 'prejuizo'


export function avaliarCpaVsTeto(cpaReal: number, teto: number): VerdictoCpa | null {
  if (teto <= 0 || cpaReal < 0) return null
  if (cpaReal <= teto * 0.8) return 'lucrativo'
  if (cpaReal <= teto) return 'no_limite'
  return 'prejuizo'
}
