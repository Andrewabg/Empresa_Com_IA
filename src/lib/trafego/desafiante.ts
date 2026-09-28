







export const FREQ_PARA_TESTAR = 3

export interface ConjuntoBase {
  id: string
  nome: string
  targeting: Record<string, unknown>
  frequency?: number
}

export interface Desafiante {
  nome: string
  targeting: Record<string, unknown>
  copiaDe: string
}

export class DesafianteInvalidoError extends Error {
  constructor(motivo: string) {
    super(`Nao da pra montar o desafiante: ${motivo}`)
    this.name = 'DesafianteInvalidoError'
  }
}


export function montarDesafiante(base: ConjuntoBase): Desafiante {
  if (base.frequency === undefined || base.frequency < FREQ_PARA_TESTAR) {
    throw new DesafianteInvalidoError(
      `a frequencia (${base.frequency ?? 'nao lida'}) nao sustenta a hipotese de saturacao. `
      + `Sem ela, o gargalo e pos-clique e o teste e outro.`,
    )
  }
  if (base.targeting.geo_locations == null) {
    throw new DesafianteInvalidoError('o conjunto original nao tem geo_locations, e copiar sem ela abriria o mundo inteiro')
  }

  const targeting: Record<string, unknown> = { ...base.targeting, targeting_automation: { advantage_audience: 1 } }
  delete targeting.flexible_spec
  delete targeting.interests

  return { nome: `${base.nome} · desafiante amplo`, targeting, copiaDe: base.id }
}
