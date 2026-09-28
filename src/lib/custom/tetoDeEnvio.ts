


export const TETO_ENVIOS_HORA = 100


export const JANELA_TETO_MS = 60 * 60 * 1000


export function podarCarimbos(carimbos: number[], agoraMs: number): number[] {
  const limite = agoraMs - JANELA_TETO_MS
  return carimbos.filter((c) => c >= limite)
}


export function cabeNoTeto(carimbos: number[], agoraMs: number): boolean {
  return podarCarimbos(carimbos, agoraMs).length < TETO_ENVIOS_HORA
}
