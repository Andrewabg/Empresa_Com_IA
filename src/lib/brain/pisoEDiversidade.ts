


export const PISO_DISTANCIA_PADRAO = 0.65


export const PISO_DISTANCIA_EPISODICO = 0.65


export function passaNoPiso(distancia: number | null | undefined, piso: number): boolean {
  if (distancia === null || distancia === undefined) return true
  return distancia <= piso
}
