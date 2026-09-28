

export type BlocoType =
  | 'kpi' | 'timeseries' | 'table' | 'funnel' | 'comparison'
  | 'creatives' | 'audiences' | 'goals' | 'health' | 'recommendation' | 'note'
  | 'drilldown' | 'plano' | 'historico'


export interface MetricShape {
  spend?: number; impressions?: number; reach?: number; frequency?: number
  clicks?: number; ctr?: number; cpc?: number; cpm?: number
  conversions?: number; conversion_value?: number; roas?: number; cpa?: number
  
  funnel?: Record<string, number>
  video?: { plays?: number; thruplays?: number; hook_rate?: number; hold_rate?: number }
  learning_stage?: string
  
  daily_budget?: number
  lifetime_budget?: number
  budget_remaining?: number
}

export interface PainelBloco {
  id: string
  type: BlocoType
  config: Record<string, unknown>
  snapshot_id: string | null
  annotation: string | null
  position: number
  status: 'active' | 'done'
  
  created_at?: string
}


export interface PainelBlocoPatch {
  op: 'upsert' | 'remove'
  bloco: PainelBloco 
}
