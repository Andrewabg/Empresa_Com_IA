


import type { TipoAcaoMeta, NivelMeta } from './guardrails'
import { renderAvisoResultado, JANELA_APRENDIZADO_MS, type ResultadoAcao } from './atribuicao'


export const SLUGS_ESCRITA_META = [
  'METAADS_UPDATE_CAMPAIGN',
  'AWAVE_META_GRAPH_WRITE',
  'AWAVE_META_PLAN_BATCH',
] as const


export interface LinhaLedgerCru {
  id: string
  action_slug: string | null
  action_args: Record<string, unknown> | null
  status: string
  created_at: string
}


export interface AcaoMetaLedger {
  entityId: string
  approvalId: string
  tipo: TipoAcaoMeta
  
  valorAlvoReais?: number
  
  unidade?: 'daily' | 'lifetime'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  
  resultado?: ResultadoAcao
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}


function centavosParaReais(x: unknown): number | undefined {
  if (x === null || x === undefined || x === '') return undefined
  const n = typeof x === 'number' ? x : Number(x)
  return Number.isFinite(n) ? n / 100 : undefined
}


function classificar(src: Record<string, unknown>): Pick<AcaoMetaLedger, 'tipo' | 'valorAlvoReais' | 'unidade'> | null {
  if (src.daily_budget !== undefined) {
    const v = centavosParaReais(src.daily_budget)
    return v === undefined ? null : { tipo: 'orcamento', valorAlvoReais: v, unidade: 'daily' }
  }
  if (src.lifetime_budget !== undefined) {
    const v = centavosParaReais(src.lifetime_budget)
    return v === undefined ? null : { tipo: 'orcamento', valorAlvoReais: v, unidade: 'lifetime' }
  }
  if (src.status === 'PAUSED') return { tipo: 'pausar' }
  if (src.status === 'ACTIVE') return { tipo: 'reativar' }
  return null
}

function projetarComposio(src: Record<string, unknown>, approvalId: string, status: AcaoMetaLedger['status'], created_at: string): AcaoMetaLedger | null {
  const entityId = typeof src.campaign_id === 'string' && src.campaign_id ? src.campaign_id : null
  if (!entityId) return null
  const cls = classificar(src)
  if (!cls) return null
  return { entityId, approvalId, ...cls, status, created_at }
}

function projetarGraph(src: Record<string, unknown>, approvalId: string, status: AcaoMetaLedger['status'], created_at: string): AcaoMetaLedger | null {
  const endpoint = typeof src.endpoint === 'string' ? src.endpoint : ''
  const entityId = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  if (!entityId) return null
  const body = isRecord(src.body) ? src.body : {}
  const cls = classificar(body)
  if (!cls) return null
  return { entityId, approvalId, ...cls, status, created_at }
}


export function projetarAcoesDoLedger(
  rows: LinhaLedgerCru[],
  resultadosPorChave: Map<string, ResultadoAcao> = new Map(),
): AcaoMetaLedger[] {
  const out: AcaoMetaLedger[] = []
  for (const row of rows) {
    const status = row.status as AcaoMetaLedger['status']
    const args = row.action_args ?? {}
    if (row.action_slug === 'METAADS_UPDATE_CAMPAIGN') {
      const a = projetarComposio(args, row.id, status, row.created_at)
      if (a) out.push(a)
    } else if (row.action_slug === 'AWAVE_META_GRAPH_WRITE') {
      const a = projetarGraph(args, row.id, status, row.created_at)
      if (a) out.push(a)
    } else if (row.action_slug === 'AWAVE_META_PLAN_BATCH') {
      const acoes = Array.isArray((args as Record<string, unknown>).acoes) ? (args as { acoes: unknown[] }).acoes : []
      for (const item of acoes) {
        if (!isRecord(item)) continue
        if (item.kind === 'composio' && isRecord(item.args)) {
          const a = projetarComposio(item.args, row.id, status, row.created_at)
          if (a) out.push(a)
        } else if (item.kind === 'graph') {
          const a = projetarGraph(item, row.id, status, row.created_at)
          if (a) out.push(a)
        }
      }
    }
  }
  
  for (const a of out) {
    const r = resultadosPorChave.get(`${a.approvalId}:${a.entityId}`)
    if (r) a.resultado = r
  }
  return out
}



const DIA_MS = 24 * 60 * 60 * 1000

export const CAP_COMPOSICAO = 0.50

export const JANELA_COMPOSICAO_MS = 7 * DIA_MS

export const JANELA_ESTABILIZACAO_MS = 3 * DIA_MS
const EPS = 1e-9

export interface PropostaEstabilizacao {
  tipo: TipoAcaoMeta
  nivel: NivelMeta
  
  entityId: string
  
  valorNovoReais?: number
  unidade?: 'daily' | 'lifetime'
}

export interface EstabilizacaoCtx {
  
  learningStage?: string
  
  valorAtualReais?: number
  
  agora: number
}

export interface VeredictoEstabilizacao {
  bloqueio?: string
  aviso?: string
}

const AVISO_LEARNING = 'essa entidade está em aprendizado — a mudança pode resetar o learning.'


const RESETA_LEARNING: ReadonlySet<string> = new Set(['orcamento', 'targeting'])


export function avaliarEstabilizacao(
  proposta: PropostaEstabilizacao,
  historicoEntidade: AcaoMetaLedger[],
  ctx: EstabilizacaoCtx,
): VeredictoEstabilizacao {
  const { tipo, nivel } = proposta

  
  if (historicoEntidade.some((a) => a.status === 'pending' && a.tipo === tipo)) {
    return { bloqueio: 'Já tem essa proposta esperando teu OK em /aprovações — resolve ela (aprova ou rejeita) antes de eu propor de novo.' }
  }

  
  if (tipo === 'pausar') return {}

  
  
  
  
  
  
  const emLearning = ctx.learningStage === 'LEARNING'
  if (emLearning && RESETA_LEARNING.has(tipo) && nivel === 'adset') {
    const oQue = tipo === 'orcamento' ? 'no orcamento' : 'na segmentacao'
    return { bloqueio: `Esse conjunto esta em APRENDIZADO. Mexer ${oQue} agora reseta o learning (3 a 7 dias) e o Meta freia a entrega. Espera estabilizar primeiro.` }
  }

  
  if (tipo === 'orcamento' && proposta.valorNovoReais !== undefined && proposta.valorNovoReais > 0) {
    const desdeComposicao = ctx.agora - JANELA_COMPOSICAO_MS
    const serie = historicoEntidade
      .filter(
        (a) =>
          a.tipo === 'orcamento' &&
          a.status === 'approved' && 
          a.valorAlvoReais !== undefined &&
          a.unidade === proposta.unidade && 
          Date.parse(a.created_at) >= desdeComposicao,
      )
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    
    const base = serie.length > 0 ? serie[0].valorAlvoReais : ctx.valorAtualReais
    if (base !== undefined && base > 0) {
      const variacao = Math.abs(proposta.valorNovoReais / base - 1)
      if (variacao > CAP_COMPOSICAO + EPS) {
        const dias = Math.round(JANELA_COMPOSICAO_MS / DIA_MS)
        return {
          bloqueio: `Somando as mudanças dos últimos ${dias} dias, isso já fica ${Math.round(variacao * 100)}% acima do ponto de partida (R$${base.toFixed(2)}) — passa do teto de ${Math.round(CAP_COMPOSICAO * 100)}%. Deixa a conta estabilizar antes do próximo degrau.`,
        }
      }
    }
  }

  
  
  
  if (tipo === 'orcamento') {
    const desdeAprendizado = ctx.agora - JANELA_APRENDIZADO_MS
    const ruim = historicoEntidade
      .filter((a) => a.tipo === 'orcamento' && a.resultado?.veredito === 'atrapalhou' && Date.parse(a.created_at) >= desdeAprendizado)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]
    if (ruim?.resultado) {
      const aviso = renderAvisoResultado(ruim.resultado, ruim.created_at)
      if (aviso) return { aviso }
    }
  }

  
  if (emLearning) return { aviso: AVISO_LEARNING }
  const mexeuRecente = historicoEntidade.some(
    (a) => a.status === 'approved' && Date.parse(a.created_at) >= ctx.agora - JANELA_ESTABILIZACAO_MS,
  )
  if (mexeuRecente) {
    return { aviso: 'já mexi nessa entidade nos últimos dias; ela ainda está estabilizando — confirme se é hora de mexer de novo.' }
  }
  return {}
}



const STATUS_PT: Record<AcaoMetaLedger['status'], string> = {
  pending: 'pendente',
  approved: 'aprovada',
  rejected: 'rejeitada',
}


export function renderMudancasRecentes(
  acoes: AcaoMetaLedger[],
  nomePorId: Map<string, string> = new Map(),
): string {
  if (!acoes.length) return ''
  const linhas = acoes
    .slice()
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 12)
    .map((a) => {
      const dd = a.created_at.slice(8, 10)
      const mm = a.created_at.slice(5, 7)
      const nome = nomePorId.get(a.entityId) ?? a.entityId
      const alvo = a.valorAlvoReais !== undefined ? ` p/ R$${a.valorAlvoReais.toFixed(2)}` : ''
      const verbo =
        a.tipo === 'pausar' ? 'pausou'
        : a.tipo === 'reativar' ? 'reativou'
        : a.tipo === 'orcamento' ? `ajustou orçamento${alvo}`
        : `ajustou ${a.tipo}${alvo}`
      const desfecho = a.resultado && a.resultado.veredito !== 'inconclusivo'
        ? ` — ${a.resultado.veredito}: ${a.resultado.motivo}`
        : ''
      return `- ${dd}/${mm} ${verbo} [${nome}] (${STATUS_PT[a.status]})${desfecho}`
    })
  return `\n\nMudanças recentes nesta conta (últimos dias):\n${linhas.join('\n')}`
}
