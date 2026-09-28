








import type { MetricShape } from '@/lib/trafego/types'


export function numeroDaMetrica(x: unknown): number | undefined {
  if (x === null || x === undefined || x === '') return undefined
  const n = typeof x === 'number' ? x : Number(x)
  return Number.isFinite(n) ? n : undefined
}


const num = numeroDaMetrica

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}


function byActionType(arr: unknown, candidates: readonly string[]): number | undefined {
  if (!Array.isArray(arr)) return undefined
  for (const t of candidates) {
    const found = arr.find((a) => isRecord(a) && a.action_type === t)
    if (found && isRecord(found)) {
      const v = num(found.value)
      if (v !== undefined) return v
    }
  }
  return undefined
}


function firstValue(arr: unknown): number | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined
  const first = arr[0]
  return isRecord(first) ? num(first.value) : undefined
}


export const PURCHASE_TYPES = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'] as const


export const LEAD_TYPES = ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped', 'onsite_web_lead'] as const
const ADD_TO_CART_TYPES = ['add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart', 'omni_add_to_cart'] as const
const CHECKOUT_TYPES = ['initiate_checkout', 'omni_initiated_checkout'] as const



const FUNNEL_STEPS: ReadonlyArray<{ step: string; types: readonly string[] }> = [
  { step: 'link_click', types: ['link_click'] },
  { step: 'landing_page_view', types: ['landing_page_view'] },
  { step: 'add_to_cart', types: ADD_TO_CART_TYPES },
  { step: 'initiate_checkout', types: CHECKOUT_TYPES },
  { step: 'add_payment_info', types: ['add_payment_info'] },
  { step: 'purchase', types: PURCHASE_TYPES },
]


export function normalize(
  row: Record<string, unknown>,
  conversaoTypes: readonly string[] = PURCHASE_TYPES,
): MetricShape {
  const m: MetricShape = {}

  
  const spend = num(row.spend)
  const impressions = num(row.impressions)
  if (spend !== undefined) m.spend = spend
  if (impressions !== undefined) m.impressions = impressions
  const reach = num(row.reach)
  if (reach !== undefined) m.reach = reach
  const frequency = num(row.frequency)
  if (frequency !== undefined) m.frequency = frequency
  const clicks = num(row.clicks)
  if (clicks !== undefined) m.clicks = clicks
  const cpc = num(row.cpc)
  if (cpc !== undefined) m.cpc = cpc
  const cpm = num(row.cpm)
  if (cpm !== undefined) m.cpm = cpm

  
  const ctrPp = num(row.ctr)
  if (ctrPp !== undefined) m.ctr = ctrPp / 100

  
  const conversions = byActionType(row.actions, conversaoTypes)
  if (conversions !== undefined) m.conversions = conversions

  
  
  const conversionValue = byActionType(row.action_values, conversaoTypes)
  if (conversionValue !== undefined) m.conversion_value = conversionValue

  
  let roas = byActionType(row.purchase_roas, ['omni_purchase', 'purchase'])
  if (roas === undefined) roas = firstValue(row.purchase_roas)
  if (roas === undefined && conversionValue !== undefined && spend !== undefined && spend > 0) {
    roas = conversionValue / spend
  }
  if (roas !== undefined) m.roas = roas

  
  let cpa = byActionType(row.cost_per_action_type, conversaoTypes)
  if (cpa === undefined && spend !== undefined && conversions !== undefined && conversions > 0) {
    cpa = spend / conversions
  }
  if (cpa !== undefined) m.cpa = cpa

  
  if (Array.isArray(row.actions) && row.actions.length > 0) {
    const funnel: Record<string, number> = {}
    if (impressions !== undefined) funnel.impressions = impressions
    for (const { step, types } of FUNNEL_STEPS) {
      const v = byActionType(row.actions, types)
      if (v !== undefined) funnel[step] = v
    }
    if (Object.keys(funnel).length > 0) m.funnel = funnel
  }

  
  const plays = firstValue(row.video_play_actions)
  const thruplays = firstValue(row.video_thruplay_watched_actions)
  if (plays !== undefined || thruplays !== undefined) {
    const video: NonNullable<MetricShape['video']> = {}
    if (plays !== undefined) video.plays = plays
    if (thruplays !== undefined) video.thruplays = thruplays
    if (plays !== undefined && impressions !== undefined && impressions > 0) {
      video.hook_rate = plays / impressions
    }
    if (thruplays !== undefined && plays !== undefined && plays > 0) {
      video.hold_rate = thruplays / plays
    }
    m.video = video
  }

  
  return m
}


export function learningStageFromAdset(adsetRow: Record<string, unknown>): string | undefined {
  const info = adsetRow.learning_stage_info
  if (!isRecord(info)) return undefined
  const status = info.status
  return typeof status === 'string' && status !== '' ? status : undefined
}


function budgetReais(x: unknown): number | undefined {
  const cents = num(x)
  return cents === undefined ? undefined : cents / 100
}


export function reaisParaCentavos(reais: number): string {
  return String(Math.round(reais * 100))
}

export interface AdsetEntity {
  learning?: string
  
  conversions?: number
  dailyBudget?: number
  lifetimeBudget?: number
  budgetRemaining?: number
  effectiveStatus?: string
  optimizationGoal?: string
}


export function parseAdsetEntity(row: Record<string, unknown>): AdsetEntity {
  const out: AdsetEntity = {}
  const learning = learningStageFromAdset(row)
  if (learning !== undefined) out.learning = learning
  
  if (isRecord(row.learning_stage_info)) {
    const conv = num(row.learning_stage_info.conversions)
    if (conv !== undefined) out.conversions = conv
  }
  const daily = budgetReais(row.daily_budget)
  if (daily !== undefined) out.dailyBudget = daily
  const lifetime = budgetReais(row.lifetime_budget)
  if (lifetime !== undefined) out.lifetimeBudget = lifetime
  const remaining = budgetReais(row.budget_remaining)
  if (remaining !== undefined) out.budgetRemaining = remaining
  const eff = row.effective_status
  if (typeof eff === 'string' && eff !== '') out.effectiveStatus = eff
  const goal = row.optimization_goal
  if (typeof goal === 'string' && goal !== '') out.optimizationGoal = goal
  return out
}

export interface CampaignEntity {
  
  nome?: string
  dailyBudget?: number
  lifetimeBudget?: number
  
  budgetRemaining?: number
  bidStrategy?: string
  effectiveStatus?: string
  
  advantageState?: string
  
  cbo: boolean
}


export function parseCampaignEntity(row: Record<string, unknown>): CampaignEntity {
  const out: CampaignEntity = { cbo: false }
  const nome = row.name
  if (typeof nome === 'string' && nome !== '') out.nome = nome
  const daily = budgetReais(row.daily_budget)
  if (daily !== undefined) out.dailyBudget = daily
  const lifetime = budgetReais(row.lifetime_budget)
  if (lifetime !== undefined) out.lifetimeBudget = lifetime
  
  const restante = budgetReais(row.budget_remaining)
  if (restante !== undefined) out.budgetRemaining = restante
  const bid = row.bid_strategy
  if (typeof bid === 'string' && bid !== '') out.bidStrategy = bid
  const eff = row.effective_status
  if (typeof eff === 'string' && eff !== '') out.effectiveStatus = eff
  const adv = row.advantage_state
  if (typeof adv === 'string' && adv !== '') out.advantageState = adv
  out.cbo = out.dailyBudget !== undefined || out.lifetimeBudget !== undefined
  return out
}
