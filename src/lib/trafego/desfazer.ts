








export type TipoAcao = 'orcamento' | 'pausar' | 'reativar'


export type EstadoAntes =
  | { tipo: 'orcamento'; valor: number; unidade: string }
  | { tipo: 'pausar' | 'reativar'; status: string }
  | { tipo: 'targeting'; targeting: Record<string, unknown> }

export interface EntradaEstado {
  tipo: TipoAcao
  valorAtual?: number
  unidade?: string
  statusAtual?: string
}

export type AcaoInversa =
  | { tipo: 'orcamento'; entityId: string; valorNovo: number; unidade: string }
  | { tipo: 'status'; entityId: string; status: string }
  | { tipo: 'targeting'; entityId: string; targeting: Record<string, unknown> }

export class EstadoAntesAusenteError extends Error {
  constructor() {
    super('Sem estado anterior gravado: nao ha para onde voltar. A acao foi proposta antes do freio de saida existir.')
    this.name = 'EstadoAntesAusenteError'
  }
}


export function montarEstadoAntes(e: EntradaEstado): EstadoAntes | null {
  if (e.tipo === 'orcamento') {
    if (e.valorAtual === undefined || !e.unidade) return null
    return { tipo: 'orcamento', valor: e.valorAtual, unidade: e.unidade }
  }
  if (!e.statusAtual) return null
  return { tipo: e.tipo, status: e.statusAtual }
}


export function acaoInversa(estado: EstadoAntes | null | undefined, entityId: string): AcaoInversa {
  if (!estado) throw new EstadoAntesAusenteError()
  if (estado.tipo === 'targeting') {
    
    
    if (!estado.targeting || typeof estado.targeting !== 'object') throw new EstadoAntesAusenteError()
    return { tipo: 'targeting', entityId, targeting: estado.targeting }
  }
  if (estado.tipo === 'orcamento') {
    if (typeof estado.valor !== 'number' || !estado.unidade) throw new EstadoAntesAusenteError()
    return { tipo: 'orcamento', entityId, valorNovo: estado.valor, unidade: estado.unidade }
  }
  if (!estado.status) throw new EstadoAntesAusenteError()
  return { tipo: 'status', entityId, status: estado.status }
}
