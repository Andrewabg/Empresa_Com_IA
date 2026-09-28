
import { createApproval as createApprovalDefault, listAcoesMetaRecentes as listAcoesMetaRecentesDefault } from '@/data/approvals'
import { listSnapshotsDasEntidades as listSnapshotsDasEntidadesDefault } from '@/data/trafego'
import { getSetting as getSettingDefault } from '@/data/settings'
import { runAction as runActionDefault } from '@/server/actions/actions'
import {
  lerCampaignsEntity as lerCampaignsEntityDefault,
  lerAdsetsEntity as lerAdsetsEntityDefault,
  resolverContaParaAcao,
} from './buscarMetricas'
import { montarAcaoMeta, type MontarAcaoMetaDados, type ExecPayload } from './proporAcaoMeta'
import { type AcaoMetaLedger } from '@/lib/trafego/estabilizacao'
import { JANELA_APRENDIZADO_MS } from '@/lib/trafego/atribuicao'
import type { TipoAcaoMeta, NivelMeta } from '@/lib/trafego/guardrails'
import { baseDaDecisao, montarReason, type SnapshotDaBase } from '@/lib/trafego/baseDaDecisao'
import type { StatusDaEntidade } from '@/lib/trafego/statusLido'
import { notificarAprovacao } from '@/server/proativo/producers'



export interface AcaoPlanoInput {
  tipo: TipoAcaoMeta
  nivel?: NivelMeta
  entityId: string
  
  valorNovo?: number
  
  valor?: number
  nome?: string
  motivo?: string
  
  evidencia?: string
  
  statusAtual?: StatusDaEntidade
}

export interface ProporPlanoInput {
  acoes: AcaoPlanoInput[]
}

export interface ProporPlanoCtx {
  operatorId?: string
  actingAgentId?: string
  
  investigacao?: boolean
}

export interface ProporPlanoDeps {
  listSnapshotsDasEntidades?: typeof listSnapshotsDasEntidadesDefault
  getSetting?: typeof getSettingDefault
  listAcoesMetaRecentes?: typeof listAcoesMetaRecentesDefault
  runAction?: typeof runActionDefault
  lerCampaignsEntity?: typeof lerCampaignsEntityDefault
  lerAdsetsEntity?: typeof lerAdsetsEntityDefault
  createApproval?: typeof createApprovalDefault
  agora?: () => number
}



export async function proporPlano(
  input: ProporPlanoInput,
  ctx: ProporPlanoCtx,
  deps: ProporPlanoDeps = {},
): Promise<{ output: string }> {
  if (!ctx.operatorId) {
    return { output: 'Não consegui identificar o operador — recarregue a página e tente de novo.' }
  }
  if (!input.acoes || input.acoes.length === 0) {
    return { output: 'Nenhuma ação fornecida para o plano.' }
  }

  const listSnaps = deps.listSnapshotsDasEntidades ?? listSnapshotsDasEntidadesDefault
  const getSetting = deps.getSetting ?? getSettingDefault
  const runAction = deps.runAction ?? runActionDefault
  const lerCampaigns = deps.lerCampaignsEntity ?? lerCampaignsEntityDefault
  const lerAdsets = deps.lerAdsetsEntity ?? lerAdsetsEntityDefault
  const doCreateApproval = deps.createApproval ?? createApprovalDefault
  const agora = (deps.agora ?? (() => Date.now()))()
  const agent = ctx.actingAgentId ?? 'gestor-trafego'

  
  const acoes: AcaoPlanoInput[] = input.acoes.map((a) => ({
    ...a,
    valorNovo: a.valorNovo ?? a.valor,
    nivel: a.nivel ?? 'campaign',
  }))

  
  const vistoPorPar = new Set<string>()
  const descartadas: string[] = []
  const acoesSemDedup: AcaoPlanoInput[] = []
  for (const a of acoes) {
    const par = `${a.entityId}::${a.tipo}`
    if (vistoPorPar.has(par)) {
      descartadas.push(`${a.tipo} em ${a.entityId} (duplicata)`)
    } else {
      vistoPorPar.add(par)
      acoesSemDedup.push(a)
    }
  }

  
  const niveisList = [...new Set(acoesSemDedup.map((a) => a.nivel ?? 'campaign'))] as NivelMeta[]

  const idsConhecidosPorNivel = new Map<NivelMeta, Set<string>>()
  const nomePorIdGlobal = new Map<string, string>()
  
  
  
  const snapDaBasePorId = new Map<string, SnapshotDaBase>()
  for (const nivel of niveisList) {
    const ids = new Set<string>()
    const idsDoNivel = [...new Set(acoesSemDedup.filter((a) => (a.nivel ?? 'campaign') === nivel).map((a) => a.entityId))]
    try {
      const snaps = await listSnaps(ctx.operatorId, nivel, idsDoNivel, ['window', 'consulta'])
      for (const s of snaps) {
        ids.add(s.entity_id)
        if (s.entity_name && !nomePorIdGlobal.has(s.entity_id)) nomePorIdGlobal.set(s.entity_id, s.entity_name)
        if (s.granularity !== 'consulta' && !snapDaBasePorId.has(s.entity_id)) {
          snapDaBasePorId.set(s.entity_id, { metrics: (s.metrics ?? {}) as Record<string, unknown>, period_start: s.period_start, period_end: s.period_end })
        }
      }
    } catch (e) {
      console.warn('[proporPlano] listSnapshotsDasEntidades falhou (não-fatal):', e)
    }
    idsConhecidosPorNivel.set(nivel, ids)
  }

  
  
  const accountId = await resolverContaParaAcao(agent, runAction, getSetting)
  let campaignsEntity: Awaited<ReturnType<typeof lerCampaignsEntityDefault>> = {}
  let adsetsEntity: Awaited<ReturnType<typeof lerAdsetsEntityDefault>> = {}

  const needsCampaign = acoesSemDedup.some((a) => (a.nivel ?? 'campaign') === 'campaign' && a.tipo === 'orcamento')
  const needsAdset = acoesSemDedup.some((a) => a.nivel === 'adset' && a.tipo === 'orcamento')

  if (accountId && needsCampaign) {
    try { campaignsEntity = await lerCampaigns(accountId) } catch (e) {
      console.warn('[proporPlano] lerCampaignsEntity falhou (não-fatal):', e)
    }
  }
  if (accountId && needsAdset) {
    try { adsetsEntity = await lerAdsets(accountId, runAction, agent) } catch (e) {
      console.warn('[proporPlano] lerAdsetsEntity falhou (não-fatal):', e)
    }
  }

  
  
  const listAcoes = deps.listAcoesMetaRecentes ?? listAcoesMetaRecentesDefault
  const desdeAcoes = new Date(agora - JANELA_APRENDIZADO_MS).toISOString()
  const historicoPorEntidade = new Map<string, AcaoMetaLedger[]>()
  for (const a of await listAcoes(desdeAcoes).catch(() => [] as AcaoMetaLedger[])) {
    const arr = historicoPorEntidade.get(a.entityId)
    if (arr) arr.push(a)
    else historicoPorEntidade.set(a.entityId, [a])
  }

  
  type LinhaExec = ExecPayload & { title: string }
  const linhasAceitas: LinhaExec[] = []
  
  
  
  
  
  
  const linhasPuladas: Array<{ quem: string; motivo: string }> = []
  
  
  
  const blocosDoMotivo: string[] = []

  for (const a of acoesSemDedup) {
    const nivel: NivelMeta = a.nivel ?? 'campaign'
    const idsConhecidos = idsConhecidosPorNivel.get(nivel) ?? new Set<string>()

    const dados: MontarAcaoMetaDados = {
      idsConhecidos,
      nomePorId: nomePorIdGlobal,
      campaignEntity: nivel === 'campaign' ? (campaignsEntity[a.entityId] ?? null) : null,
      adsetEntity: nivel === 'adset' ? (adsetsEntity[a.entityId] ?? null) : null,
      historicoEntidade: historicoPorEntidade.get(a.entityId) ?? [],
      agora,
      podeLerStatus: ctx.investigacao === true,
    }

    const r = montarAcaoMeta({ tipo: a.tipo, nivel, entityId: a.entityId, valorNovo: a.valorNovo, nome: a.nome, motivo: a.motivo, evidencia: a.evidencia, statusAtual: a.statusAtual }, dados)

    if (!r.ok) {
      linhasPuladas.push({ quem: `${a.tipo} em ${a.entityId}`, motivo: r.motivo })
      continue
    }

    linhasAceitas.push({ ...r.exec, title: r.title })
    const bloco = montarReason({
      porque: [r.title, a.motivo].filter(Boolean).join(': '),
      base: baseDaDecisao(snapDaBasePorId.get(a.entityId) ?? null, a.tipo),
      evidencia: a.evidencia,
    })
    if (bloco) blocosDoMotivo.push(bloco)
  }

  if (linhasAceitas.length === 0) {
    const msgs: string[] = ['Nenhuma ação válida para aplicar — 0 ações no plano.']
    if (linhasPuladas.length > 0) {
      msgs.push(`Ações descartadas: ${linhasPuladas.map((l) => `${l.quem}: ${l.motivo}`).join('; ')}.`)
    }
    if (descartadas.length > 0) msgs.push(`Duplicatas removidas: ${descartadas.join('; ')}.`)
    return { output: msgs.join(' ') }
  }

  
  const n = linhasAceitas.length
  const resumoCurto = linhasAceitas
    .slice(0, 4)
    .map((l) => l.title)
    .join('; ')
  const sufixo = n > 4 ? ` (+${n - 4} mais)` : ''
  const titulo = `Aplicar plano (${n} ${n === 1 ? 'ação' : 'ações'}): ${resumoCurto}${sufixo}`

  
  let approvalId: string
  try {
    const approval = await doCreateApproval({
      kind: 'tool_action',
      title: titulo,
      agent,
      
      
      
      ...(blocosDoMotivo.length ? { reason: blocosDoMotivo.join('\n') } : {}),
      action_slug: 'AWAVE_META_PLAN_BATCH',
      action_args: { acoes: linhasAceitas },
    })
    approvalId = approval.id
    void notificarAprovacao(approval)
  } catch {
    return { output: 'Não consegui registrar o plano de ações. Tente de novo.' }
  }

  
  const partes: string[] = [
    `Plano criado com ${n} ${n === 1 ? 'ação' : 'ações'} — aprove em /aprovações pra executar tudo de uma vez.`,
  ]
  if (descartadas.length > 0) {
    partes.push(`${descartadas.length} duplicata(s) removida(s): ${descartadas.join('; ')}.`)
  }
  if (linhasPuladas.length > 0) {
    
    
    const motivos = [...new Set(linhasPuladas.map((l) => l.motivo).filter(Boolean))]
    partes.push(
      `${linhasPuladas.length} ação(ões) pulada(s) (guardrail): ${linhasPuladas.map((l) => l.quem).join(', ')}.` +
      (motivos.length ? ` Motivo: ${motivos.join(' ')}` : ''),
    )
  }
  void approvalId
  return { output: partes.join(' ') }
}
