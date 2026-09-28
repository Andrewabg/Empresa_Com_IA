










import type { Laudo } from './portoes'


export const TETO_DE_RODADAS = 2

export type Acao = 'aprovar' | 'reescrever' | 'entregar_com_ressalva'

export interface Decisao {
  acao: Acao
  
  motivo: string
  
  rodada: number
  
  podeTentarDeNovo: boolean
}

export const COPY_DECISAO = {
  aprovado: '',
  refazer: (problemas: string[]) => `Reprovei esta leva e vou refazer: ${problemas.join('; ')}.`,
  ressalvaNoTeto: (problemas: string[]) =>
    `Já refiz o máximo de vezes que eu podia e isto continua: ${problemas.join('; ')}. Entrego assim para você decidir, em vez de ficar gastando.`,
  ressalva: (problemas: string[]) => `Vale saber antes de publicar: ${problemas.join('; ')}.`,
} as const


export function decidir(laudo: Laudo, rodada: number): Decisao {
  const r = Number.isInteger(rodada) && rodada >= 0 ? rodada : 0
  const podeTentarDeNovo = r + 1 < TETO_DE_RODADAS

  if (laudo.aprovado) {
    const ressalvas = laudo.portoes.filter((p) => !p.passou && p.gravidade === 'ressalva')
    if (!ressalvas.length) {
      return { acao: 'aprovar', motivo: COPY_DECISAO.aprovado, rodada: r, podeTentarDeNovo }
    }
    return {
      acao: 'entregar_com_ressalva',
      motivo: COPY_DECISAO.ressalva(ressalvas.map((p) => `${p.rotulo} (${p.evidencia})`)),
      rodada: r,
      podeTentarDeNovo,
    }
  }

  const bloqueios = laudo.portoes
    .filter((p) => !p.passou && p.gravidade === 'bloqueia')
    .map((p) => `${p.rotulo} (${p.evidencia})`)

  if (podeTentarDeNovo) {
    return { acao: 'reescrever', motivo: COPY_DECISAO.refazer(bloqueios), rodada: r, podeTentarDeNovo }
  }
  return {
    acao: 'entregar_com_ressalva',
    motivo: COPY_DECISAO.ressalvaNoTeto(bloqueios),
    rodada: r,
    podeTentarDeNovo: false,
  }
}
