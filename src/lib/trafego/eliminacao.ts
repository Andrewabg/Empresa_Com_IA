







import { fmtBRL } from '@/lib/trafego/format'

export type Hipotese =
  | 'conta_bloqueada' | 'anuncio_reprovado' | 'teto_de_lance'
  | 'orcamento_acabou' | 'publico_pequeno'
export type Causa = Hipotese | 'aprendizado' | 'indeterminado'

export interface EliminacaoInput {
  contaProblema: boolean
  reprovadosCount: number
  
  bidStrategy?: string
  
  orcamentoRestante?: number
  publicoEstreito: boolean
  algumEmLearning: boolean
}

export interface Descartada { hipotese: Hipotese; porque: string }
export interface Eliminacao {
  causa: Causa
  
  descartadas: Descartada[]
}


const COM_TETO = new Set(['COST_CAP', 'LOWEST_COST_WITH_BID_CAP', 'LOWEST_COST_WITH_MIN_ROAS'])


export function eliminarHipoteses(input: EliminacaoInput): Eliminacao {
  const descartadas: Descartada[] = []
  const parar = (causa: Causa): Eliminacao => ({ causa, descartadas })

  if (input.contaProblema) return parar('conta_bloqueada')
  descartadas.push({ hipotese: 'conta_bloqueada', porque: 'conta ativa, sem restricao de veiculacao' })

  if (input.reprovadosCount > 0) return parar('anuncio_reprovado')
  descartadas.push({ hipotese: 'anuncio_reprovado', porque: 'nenhum anuncio reprovado na conta' })

  
  if (input.bidStrategy !== undefined && input.bidStrategy.trim() !== '') {
    if (COM_TETO.has(input.bidStrategy)) return parar('teto_de_lance')
    descartadas.push({ hipotese: 'teto_de_lance', porque: `estrategia de lance ${input.bidStrategy}, sem teto` })
  }

  if (input.orcamentoRestante !== undefined) {
    if (input.orcamentoRestante <= 0) return parar('orcamento_acabou')
    descartadas.push({ hipotese: 'orcamento_acabou', porque: `restam ${fmtBRL(input.orcamentoRestante)} de orcamento` })
  }

  if (input.publicoEstreito) return parar('publico_pequeno')
  descartadas.push({ hipotese: 'publico_pequeno', porque: 'publico dentro do tamanho esperado' })

  return parar(input.algumEmLearning ? 'aprendizado' : 'indeterminado')
}


export function resumoEliminacao(e: Eliminacao): string {
  const nome: Record<Causa, string> = {
    conta_bloqueada: 'a conta esta com restricao de veiculacao',
    anuncio_reprovado: 'ha anuncio reprovado segurando a entrega',
    teto_de_lance: 'o teto de lance esta impedindo o leilao',
    orcamento_acabou: 'o orcamento do dia acabou',
    publico_pequeno: 'o publico ficou estreito demais',
    aprendizado: 'os conjuntos voltaram para a fase de aprendizado e o Meta esta freando de proposito',
    indeterminado: 'nao consegui isolar a causa com o que li',
  }
  const cabeca = `Causa provavel: ${nome[e.causa]}.`
  if (e.descartadas.length === 0) return cabeca
  const lista = e.descartadas.map((d) => `${d.hipotese.replace(/_/g, ' ')} (${d.porque})`).join('; ')
  return `${cabeca} Descartei antes: ${lista}.`
}
