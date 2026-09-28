
import type { OrigemCandidata } from './origemDaCandidata'

export type OrigemEpisodico = OrigemCandidata


export const ORIGENS_PROMOVIVEIS = ['dono', 'agente'] as const satisfies readonly OrigemEpisodico[]


export function origemPeloPapel(papel: string | null | undefined): OrigemEpisodico {
  return papel === 'dono' ? 'dono' : 'terceiro'
}


export function origemDoAprendizado(terceiroIngerido: boolean | undefined): OrigemEpisodico {
  return terceiroIngerido === false ? 'agente' : 'terceiro'
}


export function podePromoverPorUso(origem: string | null | undefined): boolean {
  if (origem === null || origem === undefined) return false
  return (ORIGENS_PROMOVIVEIS as readonly string[]).includes(origem)
}
