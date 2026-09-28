

export type PacingStatus = 'sub' | 'ok' | 'acima'


export const DIAS_MES_MEDIO = 30.4

export const BANDA_ALERTA = 0.15

export interface PacingMensalInput {
  
  spendMtd: number
  
  diasDecorridos: number
  
  diasNoMes: number
  
  metaMensal: number
}
export interface PacingMensal {
  status: PacingStatus
  
  projecao: number
  
  utilizacao: number
}


export function tetoMensal(dailyBudget: number): number {
  return dailyBudget * DIAS_MES_MEDIO
}


export function projetarFimDeMes(input: PacingMensalInput): PacingMensal | null {
  const { spendMtd, diasDecorridos, diasNoMes, metaMensal } = input
  if (diasDecorridos <= 0 || diasNoMes <= 0 || metaMensal <= 0 || spendMtd < 0) return null
  const projecao = (spendMtd / diasDecorridos) * diasNoMes
  const utilizacao = projecao / metaMensal
  const status: PacingStatus =
    utilizacao > 1 + BANDA_ALERTA ? 'acima' : utilizacao < 1 - BANDA_ALERTA ? 'sub' : 'ok'
  return { status, projecao, utilizacao }
}
