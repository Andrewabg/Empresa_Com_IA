


import {
  DATA_RE, LIMITE_MAXIMO, LIMITE_PADRAO, OBJETO_RE, TETO_DO_PORQUE,
  type Aresta, type ConsultaMeta, type ConsultaValida, type FiltroDaConsulta, type Incremento, type OpDeFiltro, type TipoDeNo,
} from './tipos'

const CAMPOS_INSIGHTS = [
  'spend', 'impressions', 'reach', 'frequency', 'clicks', 'unique_clicks', 'ctr', 'cpc', 'cpm',
  'inline_link_clicks', 'inline_link_click_ctr', 'cost_per_inline_link_click', 'outbound_clicks',
  'actions', 'action_values', 'cost_per_action_type', 'purchase_roas',
  'video_play_actions', 'video_thruplay_watched_actions', 'video_p25_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p100_watched_actions',
  'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking', 'objective', 'optimization_goal',
  'account_name', 'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name',
] as const

const CAMPOS_CAMPANHA = [
  'id', 'name', 'objective', 'status', 'effective_status', 'daily_budget', 'lifetime_budget', 'budget_remaining',
  'bid_strategy', 'buying_type', 'special_ad_categories', 'start_time', 'stop_time', 'created_time', 'updated_time',
] as const
const CAMPOS_CONJUNTO = [
  'id', 'name', 'status', 'effective_status', 'optimization_goal', 'billing_event', 'bid_strategy', 'bid_amount',
  'daily_budget', 'lifetime_budget', 'budget_remaining', 'targeting', 'promoted_object', 'learning_stage_info',
  'start_time', 'end_time', 'campaign_id', 'created_time', 'updated_time',
] as const
const CAMPOS_ANUNCIO = [
  'id', 'name', 'status', 'effective_status', 'creative', 'adset_id', 'campaign_id', 'ad_review_feedback', 'created_time', 'updated_time',
] as const
const CAMPOS_CRIATIVO = [
  'id', 'name', 'title', 'body', 'object_story_spec', 'asset_feed_spec', 'call_to_action_type', 'effective_object_story_id',
  'status', 'thumbnail_url', 'video_id', 'link_url',
] as const


const CAMPOS_CONTA = [
  'id', 'name', 'account_status', 'currency', 'timezone_name', 'amount_spent', 'balance', 'spend_cap', 'min_daily_budget',
] as const
const CAMPOS_AUDIENCIA = [
  'id', 'name', 'subtype', 'approximate_count_lower_bound', 'approximate_count_upper_bound', 'delivery_status',
  'description', 'time_created', 'time_updated', 'operation_status', 'retention_days',
] as const

export const CAMPOS_POR_NO: Record<TipoDeNo, ReadonlyArray<string>> = {
  conta: CAMPOS_CONTA, campanha: CAMPOS_CAMPANHA, conjunto: CAMPOS_CONJUNTO, anuncio: CAMPOS_ANUNCIO, criativo: CAMPOS_CRIATIVO,
}
export const CAMPOS_POR_ARESTA: Record<Exclude<Aresta, 'detalhes'>, ReadonlyArray<string>> = {
  insights: CAMPOS_INSIGHTS, campanhas: CAMPOS_CAMPANHA, conjuntos: CAMPOS_CONJUNTO, anuncios: CAMPOS_ANUNCIO,
  criativos: CAMPOS_CRIATIVO, audiencias: CAMPOS_AUDIENCIA,
}
export const CAMPOS_PADRAO: Record<Exclude<Aresta, 'detalhes'>, ReadonlyArray<string>> = {
  insights: ['spend', 'impressions', 'reach', 'frequency', 'clicks', 'ctr', 'cpc', 'cpm', 'actions', 'action_values', 'purchase_roas'],
  campanhas: ['id', 'name', 'objective', 'status', 'effective_status', 'daily_budget', 'lifetime_budget', 'bid_strategy'],
  conjuntos: ['id', 'name', 'status', 'effective_status', 'optimization_goal', 'daily_budget', 'lifetime_budget', 'learning_stage_info', 'campaign_id'],
  anuncios: ['id', 'name', 'status', 'effective_status', 'creative', 'adset_id', 'campaign_id'],
  criativos: ['id', 'name', 'title', 'body', 'call_to_action_type', 'status'],
  audiencias: ['id', 'name', 'subtype', 'approximate_count_lower_bound', 'approximate_count_upper_bound', 'delivery_status'],
}

export const CAMPOS_DE_ID_DO_NIVEL: Record<'campaign' | 'adset' | 'ad', [string, string]> = {
  campaign: ['campaign_id', 'campaign_name'], adset: ['adset_id', 'adset_name'], ad: ['ad_id', 'ad_name'],
}

export const COMBOS_DE_BREAKDOWN: ReadonlyArray<ReadonlyArray<string>> = [
  ['age'], ['gender'], ['age', 'gender'], ['publisher_platform', 'platform_position'], ['device_platform'], ['country'],
  ['region'], ['hourly_stats_aggregated_by_advertiser_time_zone'], ['impression_device'], ['product_id'],
]
export const PRESETS: ReadonlyArray<string> = [
  'today', 'yesterday', 'last_3d', 'last_7d', 'last_14d', 'last_28d', 'last_30d', 'last_90d', 'this_month', 'last_month', 'this_quarter', 'maximum',
]
export const CAMPOS_DE_FILTRO_INSIGHTS: ReadonlyArray<string> = [
  'campaign.id', 'campaign.name', 'campaign.effective_status', 'adset.id', 'adset.name', 'adset.effective_status',
  'ad.id', 'ad.name', 'ad.effective_status', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'reach', 'frequency', 'objective',
]
export const CAMPOS_DE_FILTRO_DE_OBJETO: ReadonlyArray<string> = ['id', 'name', 'effective_status', 'objective', 'campaign.id', 'adset.id']
export const CAMPOS_ORDENAVEIS: ReadonlyArray<string> = [
  'spend', 'impressions', 'reach', 'frequency', 'clicks', 'unique_clicks', 'ctr', 'cpc', 'cpm', 'inline_link_clicks',
]
const NIVEL_GRAPH: Record<'campanha' | 'conjunto' | 'anuncio', 'campaign' | 'adset' | 'ad'> = { campanha: 'campaign', conjunto: 'adset', anuncio: 'ad' }
const OPS: ReadonlySet<OpDeFiltro> = new Set(['igual', 'contem', 'maior', 'menor', 'em'])
const ARESTAS: ReadonlySet<Aresta> = new Set(['insights', 'campanhas', 'conjuntos', 'anuncios', 'criativos', 'detalhes', 'audiencias'])
const TIPOS: ReadonlySet<TipoDeNo> = new Set(['conta', 'campanha', 'conjunto', 'anuncio', 'criativo'])
const INCREMENTOS: ReadonlySet<Incremento> = new Set(['dia', 'semana', 'mes', 'total'])
const NOME_RE = /^[a-z][a-z0-9_]{0,60}$/
const NOME_DE_FILTRO_RE = /^[a-z][a-z0-9_.]{0,60}$/

function lista(xs: ReadonlyArray<string>): string { return xs.join(', ') }
function combos(): string { return COMBOS_DE_BREAKDOWN.map((c) => c.join(',')).join(' | ') }
function ehEscalar(v: unknown): v is string | number { return typeof v === 'string' || typeof v === 'number' }

export function validarConsulta(input: ConsultaMeta): { ok: true; consulta: ConsultaValida } | { ok: false; erros: string[] } {
  const erros: string[] = []
  const aresta = input.aresta
  if (!ARESTAS.has(aresta)) return { ok: false, erros: [`Aresta desconhecida. Use uma de: ${lista([...ARESTAS])}.`] }

  const objeto = String(input.objeto ?? '').trim()
  const objetoOk = objeto === 'conta' || OBJETO_RE.test(objeto)
  if (!objetoOk) erros.push('Objeto inválido: use "conta" para a conta selecionada ou o id numérico da entidade (campanha, conjunto, anúncio, criativo). Nunca "me".')

  let tipoDoNo: TipoDeNo | null = null
  if (aresta === 'detalhes') {
    if (objeto === 'conta') tipoDoNo = 'conta'
    else if (input.tipo && TIPOS.has(input.tipo) && input.tipo !== 'conta') tipoDoNo = input.tipo
    else erros.push('Em detalhes de um id, diga o tipo do objeto: campanha, conjunto, anuncio ou criativo.')
  }

  let levelGraph: ConsultaValida['levelGraph'] = null
  if (aresta === 'insights' && input.nivel) {
    const lg = NIVEL_GRAPH[input.nivel]
    if (lg) levelGraph = lg
    else erros.push('Nível inválido: use campanha, conjunto ou anuncio.')
  } else if (aresta === 'insights' && objeto !== 'conta' && input.tipo && input.tipo in NIVEL_GRAPH) {
    levelGraph = NIVEL_GRAPH[input.tipo as keyof typeof NIVEL_GRAPH]
  }

  const catalogo: ReadonlyArray<string> = aresta === 'detalhes' ? (tipoDoNo ? CAMPOS_POR_NO[tipoDoNo] : []) : CAMPOS_POR_ARESTA[aresta]
  const padrao: ReadonlyArray<string> = aresta === 'detalhes' ? catalogo : CAMPOS_PADRAO[aresta]
  const pedidos = Array.isArray(input.campos) && input.campos.length ? input.campos.map((c) => String(c).trim()) : [...padrao]
  const desconhecidos = pedidos.filter((c) => !NOME_RE.test(c) || !catalogo.includes(c))
  if (desconhecidos.length && catalogo.length) erros.push(`Campo que não existe nesta leitura: ${lista(desconhecidos)}. Campos disponíveis: ${lista(catalogo)}.`)
  let campos = [...new Set(pedidos.filter((c) => catalogo.includes(c)))]
  if (aresta === 'insights' && levelGraph) for (const c of CAMPOS_DE_ID_DO_NIVEL[levelGraph]) if (!campos.includes(c)) campos.push(c)

  let periodo: ConsultaValida['periodo'] = null
  let incremento: Incremento = 'total'
  if (input.periodo) {
    if (aresta !== 'insights') erros.push('Período só vale em insights; nas outras leituras deixe o período de fora.')
    else {
      const p = input.periodo
      if (p.since || p.until) {
        if (!p.since || !p.until || !DATA_RE.test(p.since) || !DATA_RE.test(p.until) || p.since > p.until) erros.push('Período por datas precisa de since e until no formato AAAA-MM-DD, com since antes de until.')
        else periodo = { since: p.since, until: p.until }
      } else if (p.preset) {
        if (!PRESETS.includes(p.preset)) erros.push(`Preset de período desconhecido. Use um de: ${lista(PRESETS)}, ou since/until.`)
        else periodo = { preset: p.preset }
      }
      if (p.incremento !== undefined) {
        if (INCREMENTOS.has(p.incremento)) incremento = p.incremento
        else erros.push('Incremento inválido: use dia, semana, mes ou total.')
      }
    }
  }

  let breakdowns: string[] = []
  if (Array.isArray(input.breakdowns) && input.breakdowns.length) {
    if (aresta !== 'insights') erros.push('Breakdowns só valem em insights.')
    else {
      const pedido = [...new Set(input.breakdowns.map((b) => String(b).trim()))].sort()
      const combo = COMBOS_DE_BREAKDOWN.find((c) => c.length === pedido.length && [...c].sort().every((x, i) => x === pedido[i]))
      if (!combo) erros.push(`Combinação de breakdowns que a Meta não aceita. Combinações disponíveis: ${combos()}.`)
      else breakdowns = [...combo]
    }
  }

  const filtros: FiltroDaConsulta[] = []
  if (Array.isArray(input.filtros) && input.filtros.length) {
    if (aresta === 'detalhes') erros.push('Detalhes de um objeto não aceita filtros.')
    else {
      const permitidos = aresta === 'insights' ? CAMPOS_DE_FILTRO_INSIGHTS : CAMPOS_DE_FILTRO_DE_OBJETO
      for (const f of input.filtros) {
        const campo = String(f?.campo ?? '').trim()
        if (!NOME_DE_FILTRO_RE.test(campo) || !permitidos.includes(campo)) { erros.push(`Filtro por campo que não existe: ${campo || '(vazio)'}. Campos filtráveis: ${lista(permitidos)}.`); continue }
        if (!OPS.has(f.op)) { erros.push('Operador de filtro inválido: use igual, contem, maior, menor ou em.'); continue }
        if (f.op === 'em') {
          if (!Array.isArray(f.valor) || f.valor.length === 0 || !f.valor.every(ehEscalar)) { erros.push(`O filtro "em" pede uma lista de valores (campo ${campo}).`); continue }
        } else if (!ehEscalar(f.valor)) { erros.push(`O filtro ${f.op} pede um valor só (campo ${campo}).`); continue }
        filtros.push({ campo, op: f.op, valor: f.valor })
      }
    }
  }

  let ordenar: ConsultaValida['ordenar'] = null
  if (input.ordenar) {
    const campo = String(input.ordenar.campo ?? '').trim()
    if (aresta !== 'insights') erros.push('Ordenar só vale em insights.')
    else if (!CAMPOS_ORDENAVEIS.includes(campo)) erros.push(`Não dá para ordenar por ${campo || '(vazio)'}. Campos ordenáveis: ${lista(CAMPOS_ORDENAVEIS)}.`)
    else ordenar = { campo, direcao: input.ordenar.direcao === 'asc' ? 'asc' : 'desc' }
  }

  const limitePedido = Number(input.limite)
  const limite = Number.isFinite(limitePedido) ? Math.min(LIMITE_MAXIMO, Math.max(1, Math.trunc(limitePedido))) : LIMITE_PADRAO

  const porque = String(input.porque ?? '').replace(/\s+/g, ' ').trim().slice(0, TETO_DO_PORQUE)
  if (!porque) erros.push('Diga em porque o que você quer descobrir com esta leitura.')

  if (erros.length) return { ok: false, erros }
  return { ok: true, consulta: { objeto, aresta, tipoDoNo, levelGraph, campos, periodo, incremento, breakdowns, filtros, ordenar, limite, porque } }
}
