

import { avaliarEstabilizacao, type AcaoMetaLedger } from './estabilizacao'
import { CONV_MIN_VEREDITO } from './sinais'

export type TipoAcaoMeta = 'pausar' | 'reativar' | 'orcamento' | 'bid' | 'targeting'
export type NivelMeta = 'campaign' | 'adset' | 'ad'

export interface AcaoMetaProposta {
  tipo: TipoAcaoMeta
  nivel: NivelMeta
  
  entityId: string
  
  valorAtual?: number
  valorNovo?: number
  
  unidade?: 'daily' | 'lifetime'
}

export interface GuardrailCtx {
  
  idsConhecidos: Set<string>
  
  agora: number
  
  orcamentoNoNivel?: NivelMeta
  
  learningStage?: string
  
  historicoEntidade?: AcaoMetaLedger[]
  
  convJanela?: number
}
export type GuardrailResult = { ok: true; aviso?: string } | { ok: false; motivo: string }


const TETO_ORCAMENTO = 0.50
const TETO_BID = 0.30
const EPS = 1e-9



export const RECUSA_ENTIDADE_DESCONHECIDA =
  'Não reconheço essa entidade na leitura atual. Leia a entidade antes de propor uma ação sobre ela.'










export const DICA_DE_ENTIDADE_PARA_O_MODELO =
  'Leia a entidade antes: pelo relatório do painel (gerarRelatorio) ou, quando você tiver a leitura livre da Meta, por insights dela no nível dela, sem detalhamento e com incremento total.'
export const DICA_DE_ENTIDADE_DO_PAINEL_PARA_O_MODELO =
  'Leia a entidade antes pelo relatório do painel (gerarRelatorio).'
export const RECUSA_SEM_VALOR_ATUAL =
  'Não consegui ler o valor atual para validar o limite da mudança. Leia a entidade antes de propor a mudança.'


export function mensagemTetoExcedido(variacaoPct: number, tetoPct: number): string {
  return `Essa mudança é de ${variacaoPct}%, acima do teto de ${tetoPct}% por ação (evito mexer demais de uma vez e resetar o aprendizado). Faça em passos.`
}


export function avisoSinalImaturo(conv: number): string {
  return `sinal ainda imaturo (${conv} conversões na janela): escalar sobre pouca conversão é apostar em ruído, confirme.`
}


export const MENSAGENS_DO_GUARDRAIL: readonly string[] = [
  RECUSA_ENTIDADE_DESCONHECIDA,
  RECUSA_SEM_VALOR_ATUAL,
  avisoSinalImaturo(2),
  mensagemTetoExcedido(60, 50),
]

const nivelLabel = (n: NivelMeta): string =>
  n === 'campaign' ? 'na campanha' : n === 'adset' ? 'no conjunto' : 'no anúncio'


export function validarAcaoMeta(acao: AcaoMetaProposta, ctx: GuardrailCtx): GuardrailResult {
  if (!ctx.idsConhecidos.has(acao.entityId)) {
    return { ok: false, motivo: RECUSA_ENTIDADE_DESCONHECIDA }
  }
  if (acao.tipo === 'orcamento' || acao.tipo === 'bid') {
    const { valorAtual, valorNovo } = acao
    if (valorAtual === undefined || !(valorAtual > 0)) {
      return { ok: false, motivo: RECUSA_SEM_VALOR_ATUAL }
    }
    if (valorNovo === undefined || !(valorNovo > 0)) {
      return { ok: false, motivo: 'O novo valor precisa ser um número positivo, em reais.' }
    }
    const teto = acao.tipo === 'orcamento' ? TETO_ORCAMENTO : TETO_BID
    const variacao = Math.abs(valorNovo / valorAtual - 1)
    if (variacao > teto + EPS) {
      return { ok: false, motivo: mensagemTetoExcedido(Math.round(variacao * 100), Math.round(teto * 100)) }
    }
    if (acao.tipo === 'orcamento' && ctx.orcamentoNoNivel && ctx.orcamentoNoNivel !== acao.nivel) {
      return { ok: false, motivo: `Nesta conta o orçamento fica ${nivelLabel(ctx.orcamentoNoNivel)}, não ${nivelLabel(acao.nivel)}. Ajuste o orçamento ${nivelLabel(ctx.orcamentoNoNivel)}.` }
    }
  }

  
  
  const est = avaliarEstabilizacao(
    { tipo: acao.tipo, nivel: acao.nivel, entityId: acao.entityId, valorNovoReais: acao.valorNovo, unidade: acao.unidade },
    ctx.historicoEntidade ?? [],
    { learningStage: ctx.learningStage, valorAtualReais: acao.valorAtual, agora: ctx.agora },
  )
  if (est.bloqueio) return { ok: false, motivo: est.bloqueio }

  
  
  
  let aviso = est.aviso
  if (
    acao.tipo === 'orcamento' &&
    acao.valorAtual !== undefined &&
    acao.valorNovo !== undefined &&
    acao.valorNovo > acao.valorAtual &&
    ctx.convJanela !== undefined &&
    ctx.convJanela < CONV_MIN_VEREDITO
  ) {
    const imaturo = avisoSinalImaturo(ctx.convJanela)
    aviso = aviso ? `${aviso} ${imaturo}` : imaturo
  }

  return aviso ? { ok: true, aviso } : { ok: true }
}
