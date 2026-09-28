
import { runAction as runActionDefault } from '../../actions/actions'
import { composioUserId } from '../../actions/composio'
import { createApproval as createApprovalDefault, listAcoesMetaRecentes as listAcoesMetaRecentesDefault } from '@/data/approvals'
import { listSnapshotsDasEntidades as listSnapshotsDasEntidadesDefault } from '@/data/trafego'
import { getSetting as getSettingDefault } from '@/data/settings'
import { validarAcaoMeta, RECUSA_ENTIDADE_DESCONHECIDA, DICA_DE_ENTIDADE_PARA_O_MODELO, type TipoAcaoMeta, type NivelMeta } from '@/lib/trafego/guardrails'
import { type AcaoMetaLedger } from '@/lib/trafego/estabilizacao'
import { JANELA_APRENDIZADO_MS } from '@/lib/trafego/atribuicao'
import { reaisParaCentavos } from '@/lib/trafego/normalize'
import { montarEstadoAntes, type EstadoAntes } from '@/lib/trafego/desfazer'
import { baseDaDecisao, montarReason, type SnapshotDaBase } from '@/lib/trafego/baseDaDecisao'
import { statusLido, type StatusDaEntidade } from '@/lib/trafego/statusLido'
import { numeroDaMetrica } from '@/lib/trafego/normalize'
import {
  lerCampaignsEntity as lerCampaignsEntityDefault,
  lerAdsetsEntity as lerAdsetsEntityDefault,
  resolverContaParaAcao,
} from './buscarMetricas'

const SLUG_CAMPAIGN = 'METAADS_UPDATE_CAMPAIGN'
const SENTINELA_GRAPH_WRITE = 'AWAVE_META_GRAPH_WRITE'
const STATUS_DE: Record<string, string> = { pausar: 'PAUSED', reativar: 'ACTIVE' }


export const RECUSA_SEM_STATUS_ATUAL =
  'Para pausar ou reativar, leia antes o campo status da entidade (consultarMeta, nos detalhes) e passe statusAtual. É o campo status, não o effective_status.'






export type ExecPayload =
  | { kind: 'composio'; slug: string; args: Record<string, unknown>; estadoAntes?: EstadoAntes }
  | { kind: 'graph'; endpoint: string; body: Record<string, unknown>; estadoAntes?: EstadoAntes }


export interface MontarAcaoMetaDados {
  idsConhecidos: Set<string>
  nomePorId: Map<string, string>
  
  campaignEntity?: { dailyBudget?: number; lifetimeBudget?: number; cbo: boolean } | null
  
  adsetEntity?: { dailyBudget?: number; lifetimeBudget?: number; learning?: string } | null
  
  historicoEntidade?: AcaoMetaLedger[]
  
  agora?: number
  
  podeLerStatus?: boolean
}

export type MontarAcaoMetaResult =
  | { ok: true; exec: ExecPayload; title: string; aviso?: string }
  | { ok: false; motivo: string }






const RECUSA_SEM_CONTA_PARA_ORCAMENTO =
  'Não consegui identificar a conta pra ler o orçamento atual. Selecione a conta em /trafego e tente de novo.'
const RECUSA_CAMPANHA_ABO =
  'O orçamento não está na campanha: esta conta é ABO (orçamento fica no conjunto). Ajuste o orçamento no conjunto; isso chega na próxima versão.'
const RECUSA_AD_SEM_ORCAMENTO_PROPRIO =
  'Anúncios não têm orçamento próprio. Ajuste o orçamento no conjunto (adset) ou na campanha.'
const RECUSA_ADSET_SEM_ORCAMENTO_PROPRIO =
  'Este conjunto não tem orçamento próprio: a conta usa orçamento de campanha (CBO). Ajuste o orçamento na CAMPANHA, não no conjunto.'

const mensagemNivelNaoSuportado = (nivel: string): string => `Nível "${nivel}" não suportado. Use campaign, adset ou ad.`


export const MENSAGENS_DO_ATO: readonly string[] = [
  RECUSA_SEM_CONTA_PARA_ORCAMENTO,
  RECUSA_CAMPANHA_ABO,
  RECUSA_AD_SEM_ORCAMENTO_PROPRIO,
  RECUSA_ADSET_SEM_ORCAMENTO_PROPRIO,
  mensagemNivelNaoSuportado('adset'),
]




const RECUSA_SEM_OPERADOR_DA_ESCRITA =
  'Não consegui identificar o operador. Recarregue a página e tente de novo.'
const RECUSA_SEM_CONTA_CONECTADA =
  'Não encontrei uma conta de anúncios conectada. Conecte o Meta Ads em /config (toolkit Meta Ads) e reconecte se a sessão tiver expirado.'
const RECUSA_PROPOSTA_NAO_REGISTRADA = 'Não consegui registrar a proposta de ação. Tente de novo.'

const CONVITE_A_APROVAR = 'Aprove em /aprovações pra executar. Eu não faço nada sem seu OK.'


export const MENSAGENS_DA_ESCRITA_META: readonly string[] = [
  RECUSA_SEM_OPERADOR_DA_ESCRITA,
  RECUSA_SEM_CONTA_CONECTADA,
  RECUSA_SEM_STATUS_ATUAL,
  RECUSA_CAMPANHA_ABO,
  RECUSA_AD_SEM_ORCAMENTO_PROPRIO,
  RECUSA_ADSET_SEM_ORCAMENTO_PROPRIO,
  RECUSA_PROPOSTA_NAO_REGISTRADA,
  CONVITE_A_APROVAR,
]


export function montarAcaoMeta(
  input: ProporEscritaMetaInput,
  dados: MontarAcaoMetaDados,
): MontarAcaoMetaResult {
  const nivel: NivelMeta = input.nivel ?? 'campaign'
  const { idsConhecidos, nomePorId } = dados

  if (!idsConhecidos.has(input.entityId)) {
    return { ok: false, motivo: `${RECUSA_ENTIDADE_DESCONHECIDA} ${DICA_DE_ENTIDADE_PARA_O_MODELO}` }
  }

  
  
  
  const leitura = statusLido(input.tipo, input.statusAtual, dados.podeLerStatus === true)
  if (leitura.falta) return { ok: false, motivo: RECUSA_SEM_STATUS_ATUAL }

  
  if (nivel === 'campaign') {
    let valorAtual: number | undefined
    let budgetArg: Record<string, string> | undefined
    let unidade: 'daily' | 'lifetime' | undefined

    if (input.tipo === 'orcamento') {
      const campaignEntity = dados.campaignEntity ?? null
      if (!campaignEntity || campaignEntity.cbo === undefined) {
        return { ok: false, motivo: RECUSA_SEM_CONTA_PARA_ORCAMENTO }
      }
      if (!campaignEntity.cbo) {
        return { ok: false, motivo: RECUSA_CAMPANHA_ABO }
      }
      if (campaignEntity.dailyBudget !== undefined) {
        valorAtual = campaignEntity.dailyBudget
        budgetArg = { daily_budget: reaisParaCentavos(input.valorNovo ?? 0) }
        unidade = 'daily'
      } else if (campaignEntity.lifetimeBudget !== undefined) {
        valorAtual = campaignEntity.lifetimeBudget
        budgetArg = { lifetime_budget: reaisParaCentavos(input.valorNovo ?? 0) }
        unidade = 'lifetime'
      }
    }

    const guard = validarAcaoMeta(
      { tipo: input.tipo, nivel: 'campaign', entityId: input.entityId, valorAtual, valorNovo: input.valorNovo, unidade },
      { idsConhecidos, agora: dados.agora ?? 0, historicoEntidade: dados.historicoEntidade ?? [] },
    )
    if (!guard.ok) return { ok: false, motivo: guard.motivo }

    
    
    
    
    
    
    const estadoAntes = (input.tipo === 'orcamento' || input.tipo === 'pausar' || input.tipo === 'reativar')
      ? montarEstadoAntes({
          tipo: input.tipo,
          ...(valorAtual !== undefined ? { valorAtual } : {}),
          ...(unidade ? { unidade: unidade === 'daily' ? 'daily_budget' : 'lifetime_budget' } : {}),
          ...(leitura.status ? { statusAtual: leitura.status } : {}),
        })
      : null

    let args: Record<string, unknown>
    if (input.tipo === 'orcamento' && budgetArg) {
      args = { campaign_id: input.entityId, ...budgetArg }
    } else {
      args = { campaign_id: input.entityId, status: STATUS_DE[input.tipo] }
    }

    const nomeReal = nomePorId.get(input.entityId) ?? input.nome
    const verboCap =
      input.tipo === 'pausar' ? 'Pausar'
      : input.tipo === 'reativar' ? 'Reativar'
      : input.tipo === 'orcamento' ? 'Ajustar orçamento'
      : `Ajustar ${input.tipo}`
    const titulo = nomeReal
      ? `${verboCap} campanha "${nomeReal}" [${input.entityId}]`
      : `${verboCap} campanha [${input.entityId}]`

    const aviso = guard.ok && guard.aviso ? guard.aviso : undefined
    return { ok: true, exec: { kind: 'composio', slug: SLUG_CAMPAIGN, args, ...(estadoAntes ? { estadoAntes } : {}) }, title: titulo, aviso }
  }

  
  if (nivel === 'adset' || nivel === 'ad') {
    if (nivel === 'ad' && input.tipo === 'orcamento') {
      return { ok: false, motivo: RECUSA_AD_SEM_ORCAMENTO_PROPRIO }
    }

    let valorAtual: number | undefined
    let learningStage: string | undefined
    let budgetBody: Record<string, string> | undefined
    let unidade: 'daily' | 'lifetime' | undefined
    let adsetEncontradoSemBudget = false

    if (nivel === 'adset' && input.tipo === 'orcamento') {
      const adsetEntity = dados.adsetEntity ?? null
      if (adsetEntity) {
        valorAtual = adsetEntity.dailyBudget ?? adsetEntity.lifetimeBudget
        learningStage = adsetEntity.learning
        if (adsetEntity.dailyBudget !== undefined) {
          budgetBody = { daily_budget: reaisParaCentavos(input.valorNovo ?? 0) }
          unidade = 'daily'
        } else if (adsetEntity.lifetimeBudget !== undefined) {
          budgetBody = { lifetime_budget: reaisParaCentavos(input.valorNovo ?? 0) }
          unidade = 'lifetime'
        } else {
          adsetEncontradoSemBudget = true
        }
      }
    }

    if (adsetEncontradoSemBudget) {
      return { ok: false, motivo: RECUSA_ADSET_SEM_ORCAMENTO_PROPRIO }
    }

    const guard = validarAcaoMeta(
      { tipo: input.tipo, nivel, entityId: input.entityId, valorAtual, valorNovo: input.valorNovo, unidade },
      { idsConhecidos, agora: dados.agora ?? 0, orcamentoNoNivel: nivel === 'adset' ? 'adset' : undefined, learningStage, historicoEntidade: dados.historicoEntidade ?? [] },
    )
    if (!guard.ok) return { ok: false, motivo: guard.motivo }

    
    
    
    const estadoAntes = (input.tipo === 'orcamento' || input.tipo === 'pausar' || input.tipo === 'reativar')
      ? montarEstadoAntes({
          tipo: input.tipo,
          ...(valorAtual !== undefined ? { valorAtual } : {}),
          ...(unidade ? { unidade: unidade === 'daily' ? 'daily_budget' : 'lifetime_budget' } : {}),
          ...(leitura.status ? { statusAtual: leitura.status } : {}),
        })
      : null

    let graphBody: Record<string, unknown>
    if (input.tipo === 'orcamento' && budgetBody) {
      graphBody = budgetBody
    } else {
      graphBody = { status: STATUS_DE[input.tipo] }
    }

    const nivelLabel = nivel === 'adset' ? 'conjunto' : 'anúncio'
    const nomeReal = nomePorId.get(input.entityId) ?? input.nome
    const verboCap =
      input.tipo === 'pausar' ? 'Pausar'
      : input.tipo === 'reativar' ? 'Reativar'
      : input.tipo === 'orcamento' ? 'Ajustar orçamento do'
      : `Ajustar ${input.tipo} do`
    const titulo = nomeReal
      ? `${verboCap} ${nivelLabel} "${nomeReal}" [${input.entityId}]`
      : `${verboCap} ${nivelLabel} [${input.entityId}]`

    const aviso = guard.ok && guard.aviso ? guard.aviso : undefined
    return { ok: true, exec: { kind: 'graph', endpoint: '/' + input.entityId, body: graphBody, ...(estadoAntes ? { estadoAntes } : {}) }, title: titulo, aviso }
  }

  return { ok: false, motivo: mensagemNivelNaoSuportado(nivel) }
}



export interface ProporEscritaMetaInput {
  tipo: TipoAcaoMeta
  entityId: string
  
  nivel?: NivelMeta
  
  valorNovo?: number
  nome?: string
  motivo?: string
  
  evidencia?: string
  
  statusAtual?: StatusDaEntidade
}
export interface ProporEscritaMetaCtx {
  operatorId?: string
  actingAgentId?: string
  
  investigacao?: boolean
}
export interface ProporEscritaMetaDeps {
  runAction?: typeof runActionDefault
  createApproval?: typeof createApprovalDefault
  listSnapshotsDasEntidades?: typeof listSnapshotsDasEntidadesDefault
  getSetting?: typeof getSettingDefault
  listAcoesMetaRecentes?: typeof listAcoesMetaRecentesDefault
  lerCampaignsEntity?: typeof lerCampaignsEntityDefault
  lerAdsetsEntity?: typeof lerAdsetsEntityDefault
  agora?: () => number
}



export async function proporEscritaMeta(
  input: ProporEscritaMetaInput,
  ctx: ProporEscritaMetaCtx,
  deps: ProporEscritaMetaDeps = {},
): Promise<{ output: string }> {
  if (!ctx.operatorId) return { output: RECUSA_SEM_OPERADOR_DA_ESCRITA }
  const nivel: NivelMeta = input.nivel ?? 'campaign'
  const run = deps.runAction ?? runActionDefault
  const doCreateApproval = deps.createApproval ?? createApprovalDefault
  const listSnaps = deps.listSnapshotsDasEntidades ?? listSnapshotsDasEntidadesDefault
  const getSetting = deps.getSetting ?? getSettingDefault
  const lerCampaigns = deps.lerCampaignsEntity ?? lerCampaignsEntityDefault
  const lerAdsets = deps.lerAdsetsEntity ?? lerAdsetsEntityDefault
  const agora = (deps.agora ?? (() => Date.now()))()
  const agent = ctx.actingAgentId ?? 'gestor-trafego'

  
  const idsConhecidos = new Set<string>()
  const nomePorId = new Map<string, string>()
  
  const convPorId = new Map<string, number>()
  
  
  
  let snapDaBase: SnapshotDaBase | null = null
  try {
    const snaps = await listSnaps(ctx.operatorId, nivel, [input.entityId], ['window', 'consulta'])
    for (const s of snaps) {
      idsConhecidos.add(s.entity_id)
      if (s.entity_name && !nomePorId.has(s.entity_id)) nomePorId.set(s.entity_id, s.entity_name)
      
      
      
      
      if (s.granularity !== 'consulta' && !convPorId.has(s.entity_id)) {
        const conv = numeroDaMetrica((s.metrics as Record<string, unknown>)?.conversions)
        if (conv !== undefined) convPorId.set(s.entity_id, conv)
      }
      
      
      
      
      if (s.granularity !== 'consulta' && !snapDaBase && s.entity_id === input.entityId) {
        snapDaBase = { metrics: (s.metrics ?? {}) as Record<string, unknown>, period_start: s.period_start, period_end: s.period_end }
      }
    }
  } catch (e) { console.warn('[proporEscritaMeta] listSnapshotsDasEntidades falhou (não-fatal):', e) }

  
  if (!idsConhecidos.has(input.entityId)) {
    return { output: `${RECUSA_ENTIDADE_DESCONHECIDA} ${DICA_DE_ENTIDADE_PARA_O_MODELO}` }
  }

  
  
  
  
  const leitura = statusLido(input.tipo, input.statusAtual, ctx.investigacao === true)
  if (leitura.falta) return { output: RECUSA_SEM_STATUS_ATUAL }

  
  
  
  const inputEfetivo: ProporEscritaMetaInput = { ...input, statusAtual: leitura.status }

  
  
  const reason = montarReason({
    porque: input.motivo,
    base: baseDaDecisao(snapDaBase, input.tipo),
    evidencia: input.evidencia,
  })

  
  const listAcoes = deps.listAcoesMetaRecentes ?? listAcoesMetaRecentesDefault
  const desdeAcoes = new Date(agora - JANELA_APRENDIZADO_MS).toISOString()
  const historicoEntidade = (await listAcoes(desdeAcoes).catch(() => [] as AcaoMetaLedger[]))
    .filter((a) => a.entityId === input.entityId)

  

  const convJanela = convPorId.get(input.entityId)

  if (nivel === 'campaign') {
    return proporEscritaCampanha(inputEfetivo, ctx, agent, agora, nomePorId, run, getSetting, lerCampaigns, idsConhecidos, historicoEntidade, convJanela, reason)
  }
  if (nivel === 'adset' || nivel === 'ad') {
    return proporEscritaAdsetOuAd(inputEfetivo, nivel, ctx, agent, agora, nomePorId, getSetting, lerAdsets, run, doCreateApproval, idsConhecidos, historicoEntidade, convJanela, reason)
  }
  return { output: mensagemNivelNaoSuportado(nivel) }
}



async function proporEscritaCampanha(
  input: ProporEscritaMetaInput,
  _ctx: ProporEscritaMetaCtx,
  agent: string,
  agora: number,
  nomePorId: Map<string, string>,
  run: typeof runActionDefault,
  getSetting: typeof getSettingDefault,
  lerCampaigns: typeof lerCampaignsEntityDefault,
  idsConhecidos: Set<string>,
  historicoEntidade: AcaoMetaLedger[],
  convJanela: number | undefined,
  reason: string,
): Promise<{ output: string }> {
  
  let valorAtual: number | undefined
  let budgetArg: Record<string, string> | undefined
  let unidade: 'daily' | 'lifetime' | undefined
  if (input.tipo === 'orcamento') {
    const accountId = await resolverContaParaAcao(agent, run, getSetting)
    if (!accountId) {
      return { output: RECUSA_SEM_CONTA_CONECTADA }
    }
    let campaignEntity: { dailyBudget?: number; lifetimeBudget?: number; cbo: boolean } = { cbo: false }
    try {
      const campaigns = await lerCampaigns(accountId)
      campaignEntity = campaigns[input.entityId] ?? { cbo: false }
    } catch (e) {
      console.warn('[proporEscritaMeta] lerCampaignsEntity falhou (não-fatal):', e)
    }
    if (!campaignEntity.cbo) {
      return { output: RECUSA_CAMPANHA_ABO }
    }
    
    if (campaignEntity.dailyBudget !== undefined) {
      valorAtual = campaignEntity.dailyBudget
      budgetArg = { daily_budget: reaisParaCentavos(input.valorNovo ?? 0) }
      unidade = 'daily'
    } else if (campaignEntity.lifetimeBudget !== undefined) {
      valorAtual = campaignEntity.lifetimeBudget
      budgetArg = { lifetime_budget: reaisParaCentavos(input.valorNovo ?? 0) }
      unidade = 'lifetime'
    }
  }

  
  const guard = validarAcaoMeta(
    { tipo: input.tipo, nivel: 'campaign', entityId: input.entityId, valorAtual, valorNovo: input.valorNovo, unidade },
    { idsConhecidos, agora, historicoEntidade, convJanela },
  )
  if (!guard.ok) return { output: guard.motivo }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

  
  let args: Record<string, unknown>
  if (input.tipo === 'orcamento' && budgetArg) {
    args = { campaign_id: input.entityId, ...budgetArg }
  } else {
    args = { campaign_id: input.entityId, status: STATUS_DE[input.tipo] }
  }

  
  const nomeReal = nomePorId.get(input.entityId) ?? input.nome
  const verboCap =
    input.tipo === 'pausar' ? 'Pausar'
    : input.tipo === 'reativar' ? 'Reativar'
    : input.tipo === 'orcamento' ? 'Ajustar orçamento'
    : `Ajustar ${input.tipo}`
  const titulo = nomeReal
    ? `${verboCap} campanha "${nomeReal}" [${input.entityId}]`
    : `${verboCap} campanha [${input.entityId}]`

  
  
  
  
  const res = await run({ slug: SLUG_CAMPAIGN, args, userId: composioUserId(), agent, title: titulo, ...(reason ? { reason } : {}) })
  if (!res.successful) {
    const msg = typeof res.data?.message === 'string' ? res.data.message : 'erro ao registrar a proposta'
    return { output: `Não consegui criar a proposta: ${msg}.` }
  }

  const nome = nomeReal ? ` "${nomeReal}"` : ''
  const verbo =
    input.tipo === 'pausar' ? 'pausar'
    : input.tipo === 'reativar' ? 'reativar'
    : input.tipo === 'orcamento' ? 'ajustar o orçamento de'
    : input.tipo
  const motivo = input.motivo ? `, motivo: ${input.motivo}` : ''
  const aviso = guard.ok && guard.aviso ? ` ⚠ ${guard.aviso}` : ''
  return { output: `Proposta criada: ${verbo} a campanha${nome} [${input.entityId}]${motivo}. ${CONVITE_A_APROVAR}${aviso}` }
}



async function proporEscritaAdsetOuAd(
  input: ProporEscritaMetaInput,
  nivel: 'adset' | 'ad',
  _ctx: ProporEscritaMetaCtx,
  agent: string,
  agora: number,
  nomePorId: Map<string, string>,
  getSetting: typeof getSettingDefault,
  lerAdsets: typeof lerAdsetsEntityDefault,
  run: typeof runActionDefault,
  doCreateApproval: typeof createApprovalDefault,
  idsConhecidos: Set<string>,
  historicoEntidade: AcaoMetaLedger[],
  convJanela: number | undefined,
  reason: string,
): Promise<{ output: string }> {
  
  if (nivel === 'ad' && input.tipo === 'orcamento') {
    return { output: RECUSA_AD_SEM_ORCAMENTO_PROPRIO }
  }

  
  let valorAtual: number | undefined
  let learningStage: string | undefined
  let budgetBody: Record<string, string> | undefined
  let unidade: 'daily' | 'lifetime' | undefined
  let adsetEncontradoSemBudget = false

  if (nivel === 'adset' && input.tipo === 'orcamento') {
    const accountId = await resolverContaParaAcao(agent, run, getSetting)
    if (!accountId) {
      return { output: RECUSA_SEM_CONTA_CONECTADA }
    }
    try {
      const adsets = await lerAdsets(accountId, run, agent)
      const adsetEntity = adsets[input.entityId]
      if (adsetEntity) {
        valorAtual = adsetEntity.dailyBudget ?? adsetEntity.lifetimeBudget
        learningStage = adsetEntity.learning
        
        if (adsetEntity.dailyBudget !== undefined) {
          budgetBody = { daily_budget: reaisParaCentavos(input.valorNovo ?? 0) }
          unidade = 'daily'
        } else if (adsetEntity.lifetimeBudget !== undefined) {
          budgetBody = { lifetime_budget: reaisParaCentavos(input.valorNovo ?? 0) }
          unidade = 'lifetime'
        } else {
          
          
          adsetEncontradoSemBudget = true
        }
      }
    } catch (e) {
      console.warn('[proporEscritaMeta] lerAdsetsEntity falhou (não-fatal):', e)
    }
  }

  
  
  
  if (adsetEncontradoSemBudget) {
    return { output: RECUSA_ADSET_SEM_ORCAMENTO_PROPRIO }
  }

  
  const guard = validarAcaoMeta(
    { tipo: input.tipo, nivel, entityId: input.entityId, valorAtual, valorNovo: input.valorNovo, unidade },
    { idsConhecidos, agora, orcamentoNoNivel: nivel === 'adset' ? 'adset' : undefined, learningStage, historicoEntidade, convJanela },
  )
  if (!guard.ok) return { output: guard.motivo }

  
  let graphBody: Record<string, unknown>
  if (input.tipo === 'orcamento' && budgetBody) {
    graphBody = budgetBody
  } else {
    graphBody = { status: STATUS_DE[input.tipo] }
  }

  
  const nivelLabel = nivel === 'adset' ? 'conjunto' : 'anúncio'
  const nomeReal = nomePorId.get(input.entityId) ?? input.nome
  const verboCap =
    input.tipo === 'pausar' ? 'Pausar'
    : input.tipo === 'reativar' ? 'Reativar'
    : input.tipo === 'orcamento' ? 'Ajustar orçamento do'
    : `Ajustar ${input.tipo} do`
  const titulo = nomeReal
    ? `${verboCap} ${nivelLabel} "${nomeReal}" [${input.entityId}]`
    : `${verboCap} ${nivelLabel} [${input.entityId}]`

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const estadoAntes = (input.tipo === 'orcamento' || input.tipo === 'pausar' || input.tipo === 'reativar')
    ? montarEstadoAntes({
        tipo: input.tipo,
        ...(valorAtual !== undefined ? { valorAtual } : {}),
        ...(unidade ? { unidade: unidade === 'daily' ? 'daily_budget' : 'lifetime_budget' } : {}),
        ...(input.statusAtual ? { statusAtual: input.statusAtual } : {}),
      })
    : null

  
  
  let approvalId: string
  try {
    const approval = await doCreateApproval({
      kind: 'tool_action',
      title: titulo,
      agent,
      ...(reason ? { reason } : {}),
      action_slug: SENTINELA_GRAPH_WRITE,
      action_args: {
        endpoint: '/' + input.entityId,
        method: 'POST',
        body: graphBody,
        ...(estadoAntes ? { estadoAntes } : {}),
      },
    })
    approvalId = approval.id
  } catch (err) {
    return { output: RECUSA_PROPOSTA_NAO_REGISTRADA }
  }

  const nomeOut = nomeReal ? ` "${nomeReal}"` : ''
  const verbo =
    input.tipo === 'pausar' ? `pausar o ${nivelLabel}`
    : input.tipo === 'reativar' ? `reativar o ${nivelLabel}`
    : `ajustar o orçamento do ${nivelLabel}`
  const motivo = input.motivo ? `, motivo: ${input.motivo}` : ''
  const aviso = guard.ok && guard.aviso ? ` ⚠ Atenção: ${guard.aviso}` : ''
  void approvalId 
  return { output: `Proposta criada: ${verbo}${nomeOut} [${input.entityId}]${motivo}. ${CONVITE_A_APROVAR}${aviso}` }
}




export interface ProporAcaoMetaInput {
  tipo: TipoAcaoMeta
  campaignId: string
  
  valor?: number
  nome?: string
  motivo?: string
  
  evidencia?: string
  
  statusAtual?: 'ACTIVE' | 'PAUSED'
}
export type ProporAcaoMetaCtx = ProporEscritaMetaCtx
export type ProporAcaoMetaDeps = ProporEscritaMetaDeps

export async function proporAcaoMeta(
  input: ProporAcaoMetaInput,
  ctx: ProporAcaoMetaCtx,
  deps: ProporAcaoMetaDeps = {},
): Promise<{ output: string }> {
  return proporEscritaMeta(
    { tipo: input.tipo, nivel: 'campaign', entityId: input.campaignId, valorNovo: input.valor, nome: input.nome, motivo: input.motivo, evidencia: input.evidencia, statusAtual: input.statusAtual },
    ctx,
    deps,
  )
}
