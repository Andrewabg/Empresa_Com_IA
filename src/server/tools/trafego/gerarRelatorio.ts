
import { runAction as runActionDefault } from '../../actions/actions'
import {
  lerInsights as lerInsightsDefault,
  discoverAccountId as discoverAccountIdDefault,
  lerAdsetsEntity as lerAdsetsEntityDefault,
  lerCampaignsEntity as lerCampaignsEntityDefault,
  lerBreakdown as lerBreakdownDefault,
  lerSaudeConta as lerSaudeContaDefault,
  lerAdsReprovados as lerAdsReprovadosDefault,
  resolverContaParaAcao,
  type Periodo,
  type Nivel,
  type LerInsightsResult,
} from './buscarMetricas'
import { avaliarSaudeConta } from '@/lib/trafego/saudeConta'
import { avaliarPacing } from '@/lib/trafego/pacing'
import { rankearSegmentos, resumoBreakdown } from '@/lib/trafego/breakdown'
import { diagnosticarCriativos, resumoCriativo } from '@/lib/trafego/criativo'
import type { AdsetEntity, CampaignEntity } from '@/lib/trafego/normalize'
import {
  clearBlocos as clearBlocosDefault,
  upsertBloco as upsertBlocoDefault,
  createSnapshot as createSnapshotDefault,
  listDailySnapshots as listDailySnapshotsDefault,
} from '@/data/trafego'
import {
  buildKpiTiles,
  buildTimeseries,
  buildFunnelSteps,
  buildCampaignRows,
  buildCreativeRows,
  extractSignals,
  janelaAnterior,
  duracaoPeriodoDias,
  type Entidade,
} from '@/lib/trafego/relatorio'
import { sincronizarHistorico as sincronizarHistoricoDefault, CONC } from './sincronizarHistorico'
import { createLimiter } from '@/lib/concurrency'
import {
  computarBaseline as computarBaselineDefault,
  avaliarVsNormal,
  METRICAS_BASELINE,
  type AccountBaseline,
  type MetricaBaseline,
  type DiaSerie,
} from '@/lib/trafego/baseline'
import { montarArvore, selecionarAutoDrill, drilldownConfig, type EntidadeDrill, type NoCampanha } from '@/lib/trafego/drill'
import { groundFunil, groundCampanhas, notaAnomaliaFunil } from '@/lib/trafego/grounding'
import { toPainelBloco, SEM_OPERADOR } from './blocoResult'
import type { BlocoType, MetricShape, PainelBloco, PainelBlocoPatch } from '@/lib/trafego/types'
import { fmtBRL, fmtPct, fmtDelta } from '@/lib/trafego/format'
import { getAccountMemory as getAccountMemoryDefault } from '@/data/accountMemory'
import { enqueueMemoryJob as enqueueMemoryJobDefault } from '@/data/memoryJobs'
import { getSetting as getSettingDefault, setSetting as setSettingDefault } from '@/data/settings'
import { renderAccountMemory, mergeAccountMemory } from '@/lib/trafego/accountMemory'
import { linhasSegurasDaFicha } from '@/lib/trafego/graph/contextoDaConta'
import { GUARDA_DO_CONTEXTO, AVISO_DADO_VELHO_POR_PAUSA } from '@/lib/trafego/graph/mensagens'
import { lerPersonalidade, resumoPersonalidade } from '@/lib/trafego/leituraConta'
import { avaliarAcoes, resumoAcoes } from '@/lib/trafego/regras'
import { espelharEntregavelDaTarefa } from '../espelharEntregavel'
import { PURCHASE_TYPES } from '@/lib/trafego/normalize'
import { inferirFrame, resolverFrame, ARQUETIPO_LABEL, type ArquetipoConta, type FrameConta, type PerfilContaSalvo } from '@/lib/trafego/perfilConta'
import { benchmarkDe, NICHO_LABEL, type BenchmarkNicho } from '@/lib/trafego/benchmarks'
import { listAcoesMetaRecentes as listAcoesMetaRecentesDefault } from '@/data/approvals'
import { renderMudancasRecentes, type AcaoMetaLedger } from '@/lib/trafego/estabilizacao'
import { JANELA_APRENDIZADO_MS } from '@/lib/trafego/atribuicao'


const REFLECT_THROTTLE_MS = 6 * 60 * 60 * 1000
const throttleKey = (operatorId: string, accountId: string) => `reflect_account_last:${operatorId}:${accountId}`

export interface GerarRelatorioInput {
  periodo?: Periodo
}

export interface GerarRelatorioCtx {
  operatorId?: string
  actingAgentId?: string
  
  hojeISO: string
  
  taskId?: string | null
  
  conversationId?: string | null
}

export interface GerarRelatorioDeps {
  runAction?: typeof runActionDefault
  lerInsights?: typeof lerInsightsDefault
  clearBlocos?: typeof clearBlocosDefault
  upsertBloco?: typeof upsertBlocoDefault
  createSnapshot?: typeof createSnapshotDefault
  
  getAccountId?: (ctx: { operatorId?: string; actingAgentId?: string }, run: typeof runActionDefault) => Promise<string | null>
  
  sincronizarHistorico?: typeof sincronizarHistoricoDefault
  
  listDailySnapshots?: typeof listDailySnapshotsDefault
  
  computarBaseline?: typeof computarBaselineDefault
  getAccountMemory?: typeof getAccountMemoryDefault
  enqueueMemoryJob?: typeof enqueueMemoryJobDefault
  getSetting?: typeof getSettingDefault
  setSetting?: typeof setSettingDefault
  
  agora?: () => number
  
  espelhar?: typeof espelharEntregavelDaTarefa
  
  lerAdsetsEntity?: typeof lerAdsetsEntityDefault
  
  lerCampaignsEntity?: typeof lerCampaignsEntityDefault
  
  lerBreakdown?: typeof lerBreakdownDefault
  
  lerSaudeConta?: typeof lerSaudeContaDefault
  
  lerAdsReprovados?: typeof lerAdsReprovadosDefault
  
  listAcoesMetaRecentes?: typeof listAcoesMetaRecentesDefault
}

export interface GerarRelatorioResult {
  output: string
  patches: PainelBlocoPatch[]
}

const DEFAULT_AGENT = 'gestor-trafego'


const TIMESERIES_DIAS = 30

const AUTO_DRILL_CAP = 3


function resumoCampanha(camp: NoCampanha): string {
  const conj = camp.conjuntos.map((c) => `${c.nome} [${c.id}] ${c.veredito}`).join(', ')
  return `• ${camp.nome} [${camp.id}] — ${camp.veredito}${conj ? ` | conjuntos: ${conj}` : ''}`
}

const PRESET_LABEL: Record<string, string> = {
  today: 'hoje', yesterday: 'ontem', last_7d: 'últimos 7 dias',
  last_14d: 'últimos 14 dias', last_30d: 'últimos 30 dias', last_90d: 'últimos 90 dias',
  this_month: 'este mês', last_month: 'mês passado', maximum: 'período máximo',
}
function periodoLabel(p?: Periodo): string {
  if (p?.range) return `${p.range.since} a ${p.range.until}`
  const preset = p?.preset ?? 'last_7d'
  return PRESET_LABEL[preset] ?? preset
}

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}
function fmtRoasMult(n: number): string {
  return fmtNum(n) + 'x'
}
function fmtTileValue(fmt: string, value: number): string {
  if (fmt === 'brl') return fmtBRL(value)
  if (fmt === 'pct') return fmtPct(value)
  return fmtNum(value)
}


const METRICA_LABEL: Record<MetricaBaseline, string> = {
  roas: 'ROAS', cpa: 'CPA', ctr: 'CTR', cpm: 'CPM', frequency: 'Frequência',
}
const METRICA_FMT: Record<MetricaBaseline, 'brl' | 'pct' | 'num'> = {
  roas: 'num', cpa: 'brl', ctr: 'pct', cpm: 'brl', frequency: 'num',
}
function fmtMetrica(metric: MetricaBaseline, value: number): string {
  return fmtTileValue(METRICA_FMT[metric], value)
}


const LABEL_ARQ: Record<ArquetipoConta, string> = {
  ecommerce: 'Loja/Ecommerce',
  infoproduto: 'Infoproduto/Lançamento',
  'lead-gen': 'Captação de leads',
  'servico-local': 'Serviço local',
}


function anotarVsNormal(accM: MetricShape, baseline: AccountBaseline): string | null {
  if (!baseline.suficiente) {
    const d = baseline.dias
    return `Ainda aprendendo a conta (${d} ${d === 1 ? 'dia' : 'dias'} de histórico) — o normal aparece conforme os dias acumulam.`
  }
  const frags: string[] = []
  for (const metric of METRICAS_BASELINE) {
    const faixa = baseline.faixas[metric]
    const valor = accM[metric]
    if (!faixa || typeof valor !== 'number' || !Number.isFinite(valor)) continue
    const vs = avaliarVsNormal(valor, faixa)
    const label = METRICA_LABEL[metric]
    if (vs.posicao === 'dentro') {
      frags.push(`${label} ok`)
    } else {
      const pct = Math.round(Math.abs(vs.distPct) * 100)
      const dir = vs.posicao === 'acima' ? 'acima' : 'abaixo'
      frags.push(`${label} ${pct}% ${dir} do normal (mediana ${fmtMetrica(metric, faixa.mediana)})`)
    }
  }
  return frags.length ? `Vs normal da conta: ${frags.join('; ')}.` : null
}


function secaoNormal(baseline: AccountBaseline): string {
  if (!baseline.suficiente) {
    const d = baseline.dias
    return `\n\nNormal da conta: histórico ainda curto (${d} ${d === 1 ? 'dia' : 'dias'}) — o normal da conta aparece conforme os dias acumulam.`
  }
  const linhas: string[] = []
  for (const metric of METRICAS_BASELINE) {
    const faixa = baseline.faixas[metric]
    if (!faixa) continue
    const label = METRICA_LABEL[metric]
    const med = fmtMetrica(metric, faixa.mediana)
    const p25 = fmtMetrica(metric, faixa.p25)
    const p75 = fmtMetrica(metric, faixa.p75)
    const t = baseline.tendencias[metric]
    const tend = t
      ? t.direcao !== 'estável' && t.diasSeguidos >= 2
        ? ` · ${t.direcao} há ${t.diasSeguidos} dias`
        : ` · ${t.direcao}`
      : ''
    linhas.push(`${label}: normal ${med} (faixa ${p25}–${p75})${tend}`)
  }
  if (!linhas.length) return ''
  return (
    `\n\nNormal da conta (${baseline.dias} dias de histórico):\n- ${linhas.join('\n- ')}` +
    `\n\nCompare SEMPRE com o normal da conta; o que está fora da faixa OU em tendência ruim há N dias vira recomendação.`
  )
}


function secaoPersonalidade(baseline: AccountBaseline): string {
  return resumoPersonalidade(lerPersonalidade(baseline))
}


function secaoLearning(adsets: EntidadeDrill[], ent: Record<string, AdsetEntity>): string {
  const emAprendizado = adsets.filter((a) => a.learning === 'LEARNING' || a.learning === 'LEARNING_LIMITED')
  if (!emAprendizado.length) return ''
  const linhas = emAprendizado.map((a) => {
    const conv = ent[a.id]?.conversions
    return `- ${a.nome ?? '(sem nome)'} [${a.id}] ${a.learning}${conv !== undefined ? ` (${conv} conv)` : ''}`
  })
  return `\n\nConjuntos em APRENDIZADO (NÃO recomende mexer — editar reseta o aprendizado 3–7 dias):\n${linhas.join('\n')}`
}


function secaoPacing(adsets: EntidadeDrill[], dias: number): string {
  const linhas: string[] = []
  for (const a of adsets) {
    const p = avaliarPacing({ spendPeriodo: a.m.spend, dailyBudget: a.m.daily_budget, dias })
    if (!p || p.status === 'ok') continue
    const uso = Math.round(p.utilizacao * 100)
    const roasStr = a.m.roas !== undefined ? `, ROAS ${fmtRoasMult(a.m.roas)}` : ''
    linhas.push(
      p.status === 'teto'
        ? `- ${a.nome ?? '(sem nome)'} [${a.id}]: no teto do orçamento (uso ${uso}%${roasStr}) — candidato a escalar se o ROAS estiver acima do normal`
        : `- ${a.nome ?? '(sem nome)'} [${a.id}]: entregando só ${uso}% do orçamento — motor faminto (learning/lance/segmentação)`,
    )
  }
  return linhas.length ? `\n\nRitmo de orçamento (conjuntos fora do normal):\n${linhas.join('\n')}` : ''
}


function secaoCriativo(ads: Entidade[], baseline: AccountBaseline, cpaAlvo?: number, benchmark?: BenchmarkNicho | null, frame?: FrameConta): string {
  const diags = diagnosticarCriativos(
    ads.map((a) => ({ id: a.id, nome: a.name, m: a.m, baseline, cpaAlvo, ...(benchmark ? { benchmark } : {}), ...(frame ? { frame } : {}) })),
  )
  return resumoCriativo(diags)
}


const DIRETIVA =
  'O painel JÁ está montado — NÃO descreva os blocos. Monte AGORA 2–4 recomendações com ' +
  '`recomendar` (diagnóstico + passos + escopo {accountId, level, entityId}). Use SÓ os ' +
  'números acima — NUNCA invente métrica nem etapa de funil. Não peça pra recarregar.' +
  ' Os números do funil (contagens + % por etapa) e das campanhas (gasto, gasto/dia, frequência) estão ACIMA — cite-os. NUNCA diga que um número "não está disponível" se ele aparece neste relatório. NUNCA chute orçamento, gasto/dia ou frequência — leia do bloco de campanhas. A linha MAIOR VAZAMENTO nomeia a etapa de DESTINO ("X% chegaram a [etapa]"): o vazamento é a transição ANTES dessa etapa, não abandono NELA — não confunda visita→checkout com checkout→compra.'

const DIRETIVA_MEMORIA = ' Ancore as recomendações no que você já sabe da conta (acima); recomende no nível do anúncio/conjunto citando o padrão da conta — se a memória não cobre, diga que ainda está aprendendo.'

const DIRETIVA_A3 =
  ' NUNCA recomende escalar/cortar um conjunto em APRENDIZADO (LEARNING/LEARNING_LIMITED) sem avisar que editá-lo reseta o aprendizado (3–7 dias). Use a seção de RITMO DE ORÇAMENTO (escale o conjunto no teto com ROAS acima do normal; investigue o motor faminto) e a de SEGMENTO (recomende excluir/reduzir o posicionamento que vaza) como base das recomendações — sempre com os ids [entre colchetes].'

const DIRETIVA_CRIATIVO =
  ' Use a seção DIAGNÓSTICO DE CRIATIVO: recomende no nível do ANÚNCIO citando a CAUSA isolada [id]. Se a causa é DOWNSTREAM, NUNCA mande refazer a arte — o gargalo é oferta/página/público. Se é HOOK/HOLD, isso é um pedido de criativo novo pro time (Téo/Lia). NUNCA invente hook/hold de anúncio estático.'

const DIRETIVA_CONTA =
  ' Use a seção PERSONALIDADE DA CONTA: fatore o ritmo e a volatilidade. NUNCA recomende escalar no PIOR dia da conta; numa conta VOLÁTIL não corte por 1 dia ruim (espere o padrão); numa conta NOVA seja mais cauteloso. Cite o dia quando relevante.'

const DIRETIVA_REGRAS =
  ' Use o PLANO DE AÇÃO (motor de regras) como base das recomendações e do proporAcaoMeta — essas ações são determinísticas, NÃO as invente nem contradiga. Na era Andromeda o targeting manual morreu: recomende criativo diverso + consolidação de campanhas + sinal limpo (CAPI), NUNCA micro-targeting de público/interesse. Cite o [id] e o porquê.'


function removeStub(id: string): PainelBloco {
  return { id, type: 'note', config: {}, snapshot_id: null, annotation: null, position: 0, status: 'active' }
}


function shiftISO(iso: string, deltaDays: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

export async function gerarRelatorio(
  input: GerarRelatorioInput,
  ctx: GerarRelatorioCtx,
  deps: GerarRelatorioDeps = {},
): Promise<GerarRelatorioResult> {
  
  if (!ctx.operatorId) return { output: SEM_OPERADOR, patches: [] }
  const operatorId = ctx.operatorId
  const agent = ctx.actingAgentId ?? DEFAULT_AGENT

  const run = deps.runAction ?? runActionDefault
  const ler = deps.lerInsights ?? lerInsightsDefault
  const clearBlocos = deps.clearBlocos ?? clearBlocosDefault
  const upsertBloco = deps.upsertBloco ?? upsertBlocoDefault
  const createSnapshot = deps.createSnapshot ?? createSnapshotDefault
  const getAccountId = deps.getAccountId ?? discoverAccountIdDefault
  const getSetting = deps.getSetting ?? getSettingDefault
  const sincronizarHistorico = deps.sincronizarHistorico ?? sincronizarHistoricoDefault
  const listDailySnapshots = deps.listDailySnapshots ?? listDailySnapshotsDefault
  const computarBaseline = deps.computarBaseline ?? computarBaselineDefault
  const lerAdsets = deps.lerAdsetsEntity ?? lerAdsetsEntityDefault
  const lerCamps = deps.lerCampaignsEntity ?? lerCampaignsEntityDefault
  const lerBreak = deps.lerBreakdown ?? lerBreakdownDefault
  const lerSaude = deps.lerSaudeConta ?? lerSaudeContaDefault
  const lerReprovados = deps.lerAdsReprovados ?? lerAdsReprovadosDefault

  
  
  
  const accountId = await resolverContaParaAcao(agent, run, getSetting, getAccountId)
  if (!accountId) {
    return {
      output:
        'Não encontrei uma conta de anúncios conectada. Conecte o Meta Ads em /config (toolkit Meta Ads) e reconecte se a sessão tiver expirado.',
      patches: [],
    }
  }

  const getAccountMemory = deps.getAccountMemory ?? getAccountMemoryDefault
  
  const mem = await getAccountMemory(operatorId, accountId).catch((e) => {
    console.warn('[gerarRelatorio] getAccountMemory falhou (não-fatal):', e); return null
  })
  const salvoPerfil: PerfilContaSalvo | undefined = mem?.perfil?.perfilConta
  
  
  
  
  
  
  const linhasDaFicha = mem
    ? linhasSegurasDaFicha(renderAccountMemory(mergeAccountMemory(mem, {}, { origem: 'reflector', at: ctx.hojeISO })))
    : []
  const memoriaSection = linhasDaFicha.length
    ? `\n\nO que você já sabe desta conta:\n${GUARDA_DO_CONTEXTO}\n«conta»\n${linhasDaFicha.join('\n')}\n«/conta»`
    : `\n\nMemória da conta: ainda aprendendo esta conta — o que você concluir de durável vira memória automaticamente.`

  
  
  
  
  
  
  
  
  
  
  
  const prevPeriodo = janelaAnterior(input.periodo, ctx.hojeISO)
  
  
  
  const saudeContaP = lerSaude(accountId).catch(() => ({}))
  const adsReprovadosP = lerReprovados(accountId).catch(() => [])
  const adsetsEntityP = lerAdsets(accountId, run, agent)
  
  
  const campaignsEntityP = lerCamps(accountId).catch(() => ({} as Record<string, CampaignEntity>))

  const adsetsEntity = await adsetsEntityP 
  const optimizationGoals = Array.from(
    new Set(Object.values(adsetsEntity).map((e) => e.optimizationGoal).filter((g): g is string => !!g)),
  )
  
  const accProbe = await ler(accountId, 'account', input.periodo, run, agent)
  const temPurchase =
    accProbe.ok && (accProbe.rows[0]?.m.conversions !== undefined || accProbe.rows[0]?.m.roas !== undefined)
  const frame = resolverFrame(salvoPerfil, inferirFrame({ optimizationGoals, temPurchase }))

  
  
  const segmentosP = lerBreak(accountId, ['publisher_platform', 'platform_position'], input.periodo, run, agent, frame.conversaoTypes)
  
  
  
  
  const demografiaP = lerBreak(accountId, ['age', 'gender'], input.periodo, run, agent, frame.conversaoTypes)

  
  
  
  
  
  const benchmark = benchmarkDe(frame)
  

  
  
  
  
  
  
  const limiter = createLimiter(CONC)
  const syncCtxBase = { operatorId, actingAgentId: ctx.actingAgentId, hojeISO: ctx.hojeISO, objectId: accountId, conversaoTypes: frame.conversaoTypes }
  
  
  
  let pausouPorThrottle = false
  const depsComLimiter = { ...deps, limiter, aoPausar: () => { pausouPorThrottle = true } }
  const [serieDiaria] = await Promise.all([
    
    (async (): Promise<DiaSerie[]> => {
      try {
        return await sincronizarHistorico('account', null, syncCtxBase, depsComLimiter)
      } catch (e) {
        console.warn('[gerarRelatorio] sincronizarHistorico falhou (não-fatal):', e)
        return []
      }
    })(),
    
    (async (): Promise<void> => {
      try {
        await sincronizarHistorico('campaign', null, syncCtxBase, depsComLimiter)
      } catch (e) {
        console.warn('[gerarRelatorio] sincronizarHistorico(campaign) falhou (não-fatal):', e)
      }
    })(),
    
    (async (): Promise<void> => {
      try {
        await sincronizarHistorico('ad', null, syncCtxBase, depsComLimiter)
      } catch (e) {
        console.warn('[gerarRelatorio] sincronizarHistorico(ad) falhou (não-fatal):', e)
      }
    })(),
  ])
  const baseline = computarBaseline(serieDiaria)
  
  
  
  const modoBenchmark = !baseline.suficiente && benchmark != null

  
  
  
  
  const desde = shiftISO(ctx.hojeISO, -30)
  async function lerSeriePorId(nivel: 'campaign' | 'ad'): Promise<Record<string, DiaSerie[]>> {
    try {
      const dias = await listDailySnapshots(operatorId, nivel, desde, ctx.hojeISO)
      const out: Record<string, DiaSerie[]> = {}
      for (const g of dias) {
        ;(out[g.entity_id] ??= []).push({ date: g.period_start, m: g.metrics as MetricShape })
      }
      return out
    } catch (e) {
      console.warn(`[gerarRelatorio] listDailySnapshots(${nivel}) falhou (não-fatal):`, e)
      return {}
    }
  }
  const serieCampPorId = await lerSeriePorId('campaign')
  const serieAdPorId = await lerSeriePorId('ad')

  
  
  const [accCur, accPrev, campCur, adCur, adsetCur] = await Promise.all([
    frame.conversaoTypes === PURCHASE_TYPES
      ? Promise.resolve(accProbe)
      : ler(accountId, 'account', input.periodo, run, agent, frame.conversaoTypes),
    prevPeriodo ? ler(accountId, 'account', prevPeriodo, run, agent, frame.conversaoTypes) : Promise.resolve(undefined),
    ler(accountId, 'campaign', input.periodo, run, agent, frame.conversaoTypes),
    ler(accountId, 'ad', input.periodo, run, agent, frame.conversaoTypes),
    ler(accountId, 'adset', input.periodo, run, agent, frame.conversaoTypes), 
  ])

  
  const segmentos = await segmentosP
  const demografia = await demografiaP

  
  
  const cpaAlvo = frame.alvo ?? (baseline.suficiente ? baseline.faixas.cpa?.mediana : undefined)

  
  if (!accCur.ok) return { output: accCur.message, patches: [] }

  
  
  
  
  
  async function persistir(result: LerInsightsResult | undefined, nivel: Nivel): Promise<void> {
    if (!result || !result.ok) return
    await Promise.allSettled(result.rows.map(async (row) => {
      if (!row.since || !row.until) return
      try {
        await createSnapshot({
          operator_id: operatorId,
          source: 'metaads',
          level: nivel,
          entity_id: row.id,
          entity_name: row.name,
          period_start: row.since,
          period_end: row.until,
          metrics: row.m as Record<string, unknown>,
        })
      } catch (e) {
        console.warn('[gerarRelatorio] createSnapshot falhou (não-fatal):', e)
      }
    }))
  }
  
  
  await Promise.all([persistir(accCur, 'account'), persistir(campCur, 'campaign'), persistir(adCur, 'ad'), persistir(adsetCur, 'adset')])

  
  const accM = accCur.rows[0]?.m ?? {}
  const prevM = accPrev && accPrev.ok ? accPrev.rows[0]?.m : undefined
  const campEntidades: Entidade[] = campCur.ok ? campCur.rows : []
  const adEntidades: Entidade[] = adCur.ok ? adCur.rows : []

  const tiles = buildKpiTiles(accM, prevM, frame)
  
  const series = buildTimeseries(serieDiaria.slice(-TIMESERIES_DIAS))
  const campRows = buildCampaignRows(campEntidades, serieCampPorId, baseline, ctx.hojeISO, frame, benchmark)
  const steps = buildFunnelSteps(accM)
  const creativeRows = buildCreativeRows(adEntidades, baseline, cpaAlvo, benchmark)
  const signals = extractSignals(accM, campEntidades, adEntidades)

  
  const removedIds = await clearBlocos(operatorId, agent)
  const removePatches: PainelBlocoPatch[] = removedIds.map((id) => ({ op: 'remove', bloco: removeStub(id) }))

  
  
  const upsertPatches: PainelBlocoPatch[] = []
  
  
  
  async function montarR(
    type: BlocoType,
    config: Record<string, unknown>,
    position: number,
    annotation?: string | null,
  ): Promise<PainelBlocoPatch> {
    const row = await upsertBloco({
      operator_id: operatorId,
      agent_id: agent,
      type,
      config,
      position,
      ...(annotation !== undefined ? { annotation } : {}),
    })
    return { op: 'upsert', bloco: toPainelBloco(row) }
  }
  async function montar(
    type: BlocoType,
    config: Record<string, unknown>,
    position: number,
    annotation?: string | null,
  ): Promise<void> {
    upsertPatches.push(await montarR(type, config, position, annotation))
  }
  
  
  
  const gruposPlano: Record<'escalar' | 'cortar' | 'observar', { nome: string; id?: string; motivo?: string }[]> = {
    escalar: [], cortar: [], observar: [],
  }
  for (const r of campRows) {
    if (!r.veredito) continue
    const balde = r.veredito === 'aprendendo' ? 'observar' : r.veredito
    gruposPlano[balde].push({ nome: r.name, id: r.id, motivo: r.sinalPrincipal?.texto })
  }
  const baldesPlano = (['escalar', 'cortar', 'observar'] as const).map((v) => ({ veredito: v, itens: gruposPlano[v] }))

  
  
  
  const kpiAnnotation = anotarVsNormal(accM, baseline)
  const patches8a = await Promise.all([
    baldesPlano.some((b) => b.itens.length > 0) ? montarR('plano', { baldes: baldesPlano, accountId }, 0) : Promise.resolve(null),
    tiles.length ? montarR('kpi', { tiles }, 1, kpiAnnotation) : Promise.resolve(null),
    series.length ? montarR('timeseries', { title: 'Gasto — 30 dias', metric: 'spend', fmt: 'brl', headline: 'sum', series }, 2) : Promise.resolve(null),
    campRows.length ? montarR('table', { title: 'Campanhas', sortBy: 'spend', rows: campRows }, 3) : Promise.resolve(null),
    steps.length ? montarR('funnel', { title: 'Funil de conversão', steps }, 4) : Promise.resolve(null),
    creativeRows.length ? montarR('creatives', { title: 'Criativos', rows: creativeRows }, 5) : Promise.resolve(null),
  ])
  for (const p of patches8a) if (p) upsertPatches.push(p)

  
  
  const contaHealth = await saudeContaP
  const adsReprovados = await adsReprovadosP
  const saude = avaliarSaudeConta({ contaHealth, ads: adsReprovados })

  
  
  
  
  const campaignsEntity = await campaignsEntityP
  let drillSection = ''
  let acoesSection = ''
  let adsetsDrill: EntidadeDrill[] = []
  try {
    const toD = (
      rows: { id: string; name: string | null; m: MetricShape; parentIds?: { campaignId?: string; adsetId?: string } }[],
    ): EntidadeDrill[] => rows.map((r) => ({ id: r.id, nome: r.name, m: r.m, parentIds: r.parentIds }))
    
    const toDAdset = (
      rows: { id: string; name: string | null; m: MetricShape; parentIds?: { campaignId?: string; adsetId?: string } }[],
    ): EntidadeDrill[] =>
      rows.map((r) => {
        const ent = adsetsEntity[r.id]
        const m: MetricShape = ent
          ? {
              ...r.m,
              ...(ent.dailyBudget !== undefined ? { daily_budget: ent.dailyBudget } : {}),
              ...(ent.lifetimeBudget !== undefined ? { lifetime_budget: ent.lifetimeBudget } : {}),
              ...(ent.budgetRemaining !== undefined ? { budget_remaining: ent.budgetRemaining } : {}),
            }
          : r.m
        return { id: r.id, nome: r.name, m, parentIds: r.parentIds, ...(ent?.learning ? { learning: ent.learning } : {}) }
      })
    
    const toDCampaign = (
      rows: { id: string; name: string | null; m: MetricShape; parentIds?: { campaignId?: string; adsetId?: string } }[],
    ): EntidadeDrill[] =>
      rows.map((r) => {
        const ent = campaignsEntity[r.id]
        return { id: r.id, nome: r.name, m: r.m, parentIds: r.parentIds, ...(ent ? { entity: ent } : {}) }
      })
    adsetsDrill = adsetCur.ok ? toDAdset(adsetCur.rows) : []
    const arvore = montarArvore(
      campCur.ok ? toDCampaign(campCur.rows) : [],
      adsetsDrill,
      adCur.ok ? toD(adCur.rows) : [],
      baseline,
      
      
      { ...serieCampPorId, ...serieAdPorId },
      frame,
      benchmark,
    )
    
    
    const acoes = avaliarAcoes(arvore, { baseline, leitura: lerPersonalidade(baseline), cpaAlvo, frame, benchmark, campanhasAfetadas: saude.campanhasAfetadas })
    acoesSection = resumoAcoes(acoes)
    const sel = selecionarAutoDrill(arvore, AUTO_DRILL_CAP)
    const drillLines: string[] = []
    
    let pos = 6
    
    
    
    
    if (saude.contaProblema || saude.reprovadosCount > 0 || saude.spendCapPertoDoTeto) {
      const aprendizadoLimitado = adsetsDrill
        .filter((a) => a.learning === 'LEARNING_LIMITED')
        .map((a) => ({ nome: a.nome ?? '(sem nome)' }))
      const alertas = [
        saude.contaProblema ? saude.motivoConta : null,
        saude.spendCapPertoDoTeto ? 'Gasto perto do limite da conta' : null,
      ].filter((x): x is string => typeof x === 'string' && x !== '')
      await montar('health', { title: 'Saúde da conta', reprovados: saude.reprovadosCount, aprendizadoLimitado, alertas }, pos++)
    }
    for (const camp of sel) {
      await montar('drilldown', drilldownConfig(camp, accountId), pos++)
      drillLines.push(resumoCampanha(camp))
      
      
      
      const serie = serieCampPorId[camp.id]?.slice(-7)
      if (serie && serie.length >= 2) {
        const dias = serie.map((d) => d.date)
        const linhas = [
          { metrica: 'ROAS', valores: serie.map((d) => d.m.roas ?? null), fmt: 'num' as const },
          { metrica: 'Gasto', valores: serie.map((d) => d.m.spend ?? null), fmt: 'brl' as const },
          { metrica: 'CTR', valores: serie.map((d) => d.m.ctr ?? null), fmt: 'pct' as const },
          { metrica: 'Freq', valores: serie.map((d) => d.m.frequency ?? null), fmt: 'num' as const },
        ]
        await montar('historico', { campanha: { id: camp.id, nome: camp.nome }, dias, linhas }, pos++)
      }
    }
    drillSection = drillLines.length ? `\n\nÁrvore (auto-drill — explique o CRUZADO, recomende no nível do anúncio):\n${drillLines.join('\n')}` : ''
  } catch (e) {
    console.warn('[gerarRelatorio] drill (Camada 2) falhou (não-fatal):', e)
  }

  
  const patches = [...removePatches, ...upsertPatches]

  
  
  
  const listAcoes = deps.listAcoesMetaRecentes ?? listAcoesMetaRecentesDefault
  const agoraMs = (deps.agora ?? (() => Date.now()))()
  const desdeAcoes = new Date(agoraMs - JANELA_APRENDIZADO_MS).toISOString()
  const idsDaConta = new Set<string>([
    ...campEntidades.map((e) => e.id),
    ...adEntidades.map((e) => e.id),
    ...(adsetCur.ok ? adsetCur.rows.map((r) => r.id) : []),
  ])
  const nomeConta = new Map<string, string>()
  for (const e of [...campEntidades, ...adEntidades]) if (e.name) nomeConta.set(e.id, e.name)
  if (adsetCur.ok) for (const r of adsetCur.rows) if (r.name) nomeConta.set(r.id, r.name)
  const acoesRecentes = (await listAcoes(desdeAcoes).catch((e): AcaoMetaLedger[] => {
    console.warn('[gerarRelatorio] listAcoesMetaRecentes falhou (não-fatal):', e)
    return []
  })).filter((a) => idsDaConta.has(a.entityId))
  const mudancasSection = renderMudancasRecentes(acoesRecentes, nomeConta)

  
  const header =
    `Relatório de tráfego da conta [${accountId}] — período: ${periodoLabel(input.periodo)}` +
    (prevPeriodo ? ` (vs anterior: ${periodoLabel(prevPeriodo)})` : '') + '.'

  
  
  const perfilSection =
    `\n\nPerfil da conta: ${LABEL_ARQ[frame.arquetipo]} (foco em ${frame.metricaPrimaria === 'roas' ? 'ROAS' : 'CPL'})` +
    (frame.origem === 'inferido' ? ' — detectado; corrija na Ficha se estiver errado' : '')

  
  
  
  
  const benchmarkSection =
    modoBenchmark && benchmark != null && benchmark.kpi
      ? (() => {
          
          
          
          
          const rotulo = benchmark.nicho
            ? NICHO_LABEL[benchmark.nicho] ?? ARQUETIPO_LABEL[frame.arquetipo] ?? frame.arquetipo
            : ARQUETIPO_LABEL[frame.arquetipo] ?? frame.arquetipo
          const kpiStr =
            frame.metricaPrimaria === 'cpa'
              ? `CPL típico ~${fmtBRL(benchmark.kpi.tipico)}`
              : `ROAS típico ~${fmtRoasMult(benchmark.kpi.tipico)}`
          const ctrStr = benchmark.ctr ? `, CTR ~${(benchmark.ctr.tipico * 100).toFixed(1)}%` : ''
          return (
            `\n\nReferência do seu nicho (${rotulo}): ${kpiStr}${ctrStr}. Ainda não é o normal DA sua conta ` +
            `(poucos dias), é a régua de mercado pra calibrar.`
          )
        })()
      : ''

  const kpiParts = tiles.map((t) => {
    const v = fmtTileValue(t.fmt, t.value as number)
    const d = t.delta !== undefined ? ` (${fmtDelta(t.delta).label} vs anterior)` : ''
    return `${t.label} ${v}${d}`
  })
  const kpiSection = kpiParts.length ? `\n\nKPIs: ${kpiParts.join(' · ')}.` : ''

  const sinalLines: string[] = []
  if (signals.melhorCampanha) {
    const s = signals.melhorCampanha
    sinalLines.push(`Melhor campanha: ${s.name} [${s.id}] ROAS ${fmtRoasMult(s.roas)}.`)
  }
  if (signals.piorCampanha) {
    const s = signals.piorCampanha
    sinalLines.push(`Pior campanha: ${s.name} [${s.id}] gasto ${fmtBRL(s.spend)}, ROAS ${fmtRoasMult(s.roas)}.`)
  }
  if (signals.maiorDesperdicio) {
    const s = signals.maiorDesperdicio
    sinalLines.push(`Maior desperdício: ${s.name} [${s.id}] gasto ${fmtBRL(s.spend)}, ROAS ${fmtRoasMult(s.roas)}.`)
  }
  if (signals.criativoFadiga) {
    const s = signals.criativoFadiga
    sinalLines.push(`Criativo em fadiga: ${s.name} [${s.id}] (frequência ${fmtNum(s.frequency)}, CTR ${fmtPct(s.ctr)}).`)
  }
  const sinalSection = sinalLines.length ? `\n\nSinais:\n- ${sinalLines.join('\n- ')}` : ''

  
  const naoConsegui: string[] = []
  if (!campCur.ok) naoConsegui.push('ler as campanhas (tabela omitida)')
  if (!adCur.ok) naoConsegui.push('ler os criativos (bloco omitido)')
  if (series.length === 0) naoConsegui.push('montar a série diária de gasto')
  if (prevPeriodo && !(accPrev && accPrev.ok)) naoConsegui.push('ler a janela anterior (deltas indisponíveis)')
  const notaFalha = naoConsegui.length ? `\n\n(Não consegui ${naoConsegui.join('; ')}.)` : ''

  const periodoDias = duracaoPeriodoDias(input.periodo)
  const funilStr = groundFunil(accM.funnel ?? {})
  const funilSection = funilStr ? `\n\n${funilStr}` : ''
  const anomaliaStr = notaAnomaliaFunil(accM.funnel ?? {})
  const anomaliaSection = anomaliaStr ? `\n\n${anomaliaStr}` : ''
  const campanhasStr = groundCampanhas(campEntidades, periodoDias)
  const campanhasSection = campanhasStr ? `\n\n${campanhasStr}` : ''

  
  const learningSection = secaoLearning(adsetsDrill, adsetsEntity)
  const pacingSection = secaoPacing(adsetsDrill, periodoDias)
  
  
  const modoRank = frame.metricaPrimaria
  const bkTxt = resumoBreakdown(rankearSegmentos(segmentos, modoRank), 'Posicionamento')
  const demoTxt = resumoBreakdown(rankearSegmentos(demografia, modoRank), 'Idade e gênero')
  const linhasVazamento = [bkTxt, demoTxt].filter(Boolean)
  const breakdownSection = linhasVazamento.length
    ? `\n\nOnde o dinheiro vaza (por segmento):\n${linhasVazamento.join('\n')}`
    : ''
  const criativoSection = secaoCriativo(adEntidades, baseline, cpaAlvo, benchmark, frame)
  const personaSection = secaoPersonalidade(baseline)
  const temDadosA3 = learningSection !== '' || pacingSection !== '' || breakdownSection !== ''

  
  
  
  const temProblemaSaude = saude.contaProblema || saude.reprovadosCount > 0 || saude.spendCapPertoDoTeto
  const saudeSection = temProblemaSaude
    ? 'SAÚDE DA CONTA (resolva primeiro):\n' +
      (saude.contaProblema && saude.motivoConta ? `- ${saude.motivoConta}\n` : '') +
      (saude.reprovadosCount > 0 ? `- ${saude.reprovadosCount} anúncio(s) reprovado(s) na revisão do Meta — a verba não roda neles.\n` : '') +
      (saude.spendCapPertoDoTeto ? '- Gasto perto do limite da conta.\n' : '') +
      '\n'
    : ''
  
  const saudeResumo = `\n\nSaúde: ${saude.status} · ${saude.reprovadosCount} reprovados`

  
  
  
  
  const pausaSection = pausouPorThrottle ? `${AVISO_DADO_VELHO_POR_PAUSA}\n\n` : ''
  const output = `${pausaSection}${saudeSection}${header}${perfilSection}${benchmarkSection}${memoriaSection}${mudancasSection}${kpiSection}${funilSection}${anomaliaSection}${campanhasSection}${sinalSection}${drillSection}${secaoNormal(baseline)}${personaSection}${learningSection}${pacingSection}${breakdownSection}${criativoSection}${acoesSection}${saudeResumo}\n\n${DIRETIVA}${DIRETIVA_MEMORIA}${temDadosA3 ? DIRETIVA_A3 : ''}${criativoSection !== '' ? DIRETIVA_CRIATIVO : ''}${personaSection !== '' ? DIRETIVA_CONTA : ''}${acoesSection !== '' ? DIRETIVA_REGRAS : ''}${notaFalha}`

  
  
  
  
  
  
  const espelhar = deps.espelhar ?? espelharEntregavelDaTarefa
  const conteudoDoc = `${pausaSection}${saudeSection}${header}${perfilSection}${benchmarkSection}${kpiSection}${funilSection}${anomaliaSection}${campanhasSection}${sinalSection}${drillSection}${secaoNormal(baseline)}${personaSection}${learningSection}${pacingSection}${breakdownSection}${criativoSection}${acoesSection}`
  await espelhar(
    { taskId: ctx.taskId, conversationId: ctx.conversationId, actingAgentId: agent },
    { kind: 'documento', title: `Relatório de tráfego — ${periodoLabel(input.periodo)}`, content: conteudoDoc },
  )

  
  
  
  try {
    const setSetting = deps.setSetting ?? setSettingDefault
    const agora = deps.agora ?? (() => Date.now())
    const tk = throttleKey(operatorId, accountId)
    const ultimo = Number(await getSetting(tk).catch(() => null)) || 0
    if (agora() - ultimo >= REFLECT_THROTTLE_MS) {
      const enqueue = deps.enqueueMemoryJob ?? enqueueMemoryJobDefault
      try { await enqueue('reflect_account', `${operatorId}:${accountId}`) } catch (e) { console.warn('[gerarRelatorio] enqueue reflect_account falhou (não-fatal):', e) }
      try { await enqueue('reflect_brand', `${operatorId}:${accountId}`) } catch (e) { console.warn('[gerarRelatorio] enqueue reflect_brand falhou (não-fatal):', e) }
      
      
      try { await enqueue('reflect_design', `${operatorId}:${accountId}`) } catch (e) { console.warn('[gerarRelatorio] enqueue reflect_design falhou (não-fatal):', e) }
      try { await setSetting(tk, String(agora())) } catch {  }
    }
  } catch (e) {
    console.warn('[gerarRelatorio] throttle de reflexão falhou (não-fatal):', e)
  }

  return { output, patches }
}
