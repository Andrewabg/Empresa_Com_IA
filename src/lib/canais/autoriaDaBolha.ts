


export const KIND_AUTOMACAO = 'automacao'


export const AUTOR_AUTOMACAO = 'Automação'


export const AUTOR_OPERADOR = 'Você'


export const AUTOR_AGENTE_DESCONHECIDO = 'Agente'

export function ehEnvioDeAutomacao(midia: { kind: string } | null | undefined): boolean {
  return midia?.kind === KIND_AUTOMACAO
}

export interface BolhaAssinavel {
  direcao: 'in' | 'out'
  autor: 'contato' | 'agente' | 'operador'
  midia: { kind: string } | null | undefined
}


export function autorDaBolha(msg: BolhaAssinavel, nomes: { contato: string; agente: string }): string {
  if (msg.direcao === 'in') return nomes.contato
  if (ehEnvioDeAutomacao(msg.midia)) return AUTOR_AUTOMACAO
  return msg.autor === 'operador' ? AUTOR_OPERADOR : nomes.agente
}
