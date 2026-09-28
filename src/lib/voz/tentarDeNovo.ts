


export type EstadoDaVoz =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'micDenied'
  | 'micSemResposta'
  | 'budgetExceeded'
  | 'needsConfig'
  | 'error'


export function deveTentarConectar(estado: EstadoDaVoz): boolean {
  return estado === 'idle' || estado === 'micDenied' || estado === 'micSemResposta'
}
