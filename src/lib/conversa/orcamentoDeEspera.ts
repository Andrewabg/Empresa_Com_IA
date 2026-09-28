


export const TIMEOUT_MAX_MS = 2_147_483_647


export interface PrazoDoTurno {
  inatividadeMs: number
  inatividadeToolMs: number
  turnoMaxMs: number
  
  inicio: number
}


export interface ControleDePrazo {
  expirou: boolean
  
  toolsEmVoo: number
}


export function orcamentoDeEspera(prazo: PrazoDoTurno, controle: ControleDePrazo, agora: number): number {
  const restanteTotal = prazo.turnoMaxMs - (agora - prazo.inicio)
  const silencioTolerado = controle.toolsEmVoo > 0 ? prazo.inatividadeToolMs : prazo.inatividadeMs
  return Math.min(silencioTolerado, restanteTotal, TIMEOUT_MAX_MS)
}
