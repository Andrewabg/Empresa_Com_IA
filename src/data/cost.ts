import { serverDb } from '../server/supabase'
import { costUsd } from '../server/cost/pricing'
import { somarCobrancas, categoriaDoModelo, type ContagemPorCategoria } from '@/lib/canais/cobrancaMeta'
import type { MockCostSummary, MockCostPoint } from '../mock/types'


export type CostKind = 'chat' | 'embedding' | 'curator' | 'realtime' | 'action' | 'plataforma'

export interface RecordCostInput {
  kind: CostKind
  model: string
  promptTokens: number
  completionTokens: number
  
  cachedTokens?: number
  agent?: string
  tool?: string
  task_id?: string
  
  amountUsdOverride?: number
}


export async function recordCost(input: RecordCostInput): Promise<void> {
  try {
    const db = serverDb()
    const amount =
      input.amountUsdOverride ??
      costUsd(input.model, input.promptTokens, input.completionTokens, input.cachedTokens ?? 0)
    const { error } = await db.from('cost_events').insert({
      kind: input.kind,
      model: input.model,
      prompt_tokens: input.promptTokens,
      completion_tokens: input.completionTokens,
      cached_tokens: input.cachedTokens ?? 0,
      amount_usd: amount,
      agent: input.agent ?? null,
      tool: input.tool ?? null,
      task_id: input.task_id ?? null,
    })
    if (error) {
      console.warn(`[recordCost] DB error: ${error.message}`)
    }
  } catch (err) {
    console.warn('[recordCost] Unexpected error:', err)
  }
}


export async function getBudgetConfiguradoUsd(): Promise<number | null> {
  const db = serverDb()
  const { data, error } = await db
    .from('settings')
    .select('value')
    .eq('key', 'budget_usd')
    .maybeSingle()
  if (error) throw new Error(`getBudgetConfiguradoUsd: ${error.message}`)
  if (!data || data.value == null) return null 
  const n = Number(data.value)
  return Number.isFinite(n) ? n : null 
}


export async function readBudgetGate(): Promise<{ spentUsd: number; budgetUsd: number }> {
  const [spentUsd, budgetConfigurado] = await Promise.all([
    spentThisMonthUsd(),
    getBudgetConfiguradoUsd(),
  ])
  
  return { spentUsd, budgetUsd: budgetConfigurado ?? 0 }
}


async function spentThisMonthUsd(): Promise<number> {
  const db = serverDb()
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const monthStart = new Date(Date.UTC(year, month, 1)).toISOString()
  const monthEnd = new Date(Date.UTC(year, month + 1, 1)).toISOString()
  const { data, error } = await db.rpc('cost_summary', { p_start: monthStart, p_end: monthEnd })
  if (error) throw new Error(`spentThisMonthUsd: ${error.message}`)
  const total = (data as { total?: number | string } | null)?.total
  return Number(total ?? 0)
}



export async function contarCobrancasMeta(): Promise<ContagemPorCategoria[]> {
  try {
    const now = new Date()
    const inicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const fim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
    const { data, error } = await serverDb().from('cost_events')
      .select('model').eq('kind', 'plataforma').gte('created_at', inicio).lt('created_at', fim)
    if (error) throw new Error(error.message)
    
    return somarCobrancas(
      (data ?? []).map((r) => ({ billable: true, categoria: categoriaDoModelo(r.model as string) ?? 'desconhecida' })),
    )
  } catch (err) {
    console.warn('[contarCobrancasMeta] fail-open:', err)
    return []
  }
}

export async function costSummary(): Promise<MockCostSummary> {
  const db = serverDb()

  
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() 
  const monthStart = new Date(Date.UTC(year, month, 1)).toISOString()
  const monthEnd = new Date(Date.UTC(year, month + 1, 1)).toISOString()

  
  
  
  
  
  const [{ data: aggData, error: aggError }, { data: settingsData }] = await Promise.all([
    db.rpc('cost_summary', { p_start: monthStart, p_end: monthEnd }),
    db.from('settings').select('value').eq('key', 'budget_usd').maybeSingle(),
  ])

  if (aggError) throw new Error(`costSummary: ${aggError.message}`)

  
  
  
  const agg = (aggData ?? {}) as {
    total?: number | string
    by_day?: Array<{ date: string; usd: number | string }>
    by_agent?: Array<{ agent: string; usd: number | string }>
    by_tool?: Array<{ tool: string; usd: number | string }>
  }

  const spentUsd = Number(agg.total ?? 0)
  const series: MockCostPoint[] = (agg.by_day ?? []).map((r) => ({ date: r.date, usd: Number(r.usd) }))
  const topAgents = (agg.by_agent ?? []).map((r) => ({ agent: r.agent, usd: Number(r.usd) }))
  
  
  const topTools = (agg.by_tool ?? []).map((r) => ({ tool: r.tool, usd: Number(r.usd) }))

  
  
  const budgetRaw = settingsData ? Number(settingsData.value) : 0
  const budgetUsd = Number.isFinite(budgetRaw) && budgetRaw > 0 ? budgetRaw : 0

  
  const remainingUsd = budgetUsd - spentUsd

  return {
    budgetUsd,
    spentUsd,
    remainingUsd,
    topAgents,
    topTools,
    series,
  }
}
