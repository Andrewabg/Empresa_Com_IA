

export type PacingStatus = 'sub' | 'ok' | 'teto'

export interface PacingInput {
  
  spendPeriodo?: number
  
  dailyBudget?: number
  
  dias: number
}
export interface Pacing { status: PacingStatus; utilizacao: number; gastoMedioDia: number }


const SUB = 0.7

const TETO = 0.95


export function avaliarPacing(input: PacingInput): Pacing | null {
  const { spendPeriodo, dailyBudget, dias } = input
  if (dailyBudget === undefined || dailyBudget <= 0 || dias <= 0 || spendPeriodo === undefined) return null
  const gastoMedioDia = spendPeriodo / dias
  const utilizacao = gastoMedioDia / dailyBudget
  const status: PacingStatus = utilizacao < SUB ? 'sub' : utilizacao >= TETO ? 'teto' : 'ok'
  return { status, utilizacao, gastoMedioDia }
}
