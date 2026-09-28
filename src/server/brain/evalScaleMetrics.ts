


import {
  type RankedHit,
  recallAtKForCase,
  firstRelevantRank,
  normalizeText,
} from './evalMetrics'

export type QueryClass = 'factoid' | 'paraphrase' | 'aggregate' | 'cross_doc' | 'needle' | 'negative'


export interface GoldenScaleCase {
  class: QueryClass
  query: string
  expected_note_ids: string[]
  
  expected_substring?: string
  
  distractor_note_id?: string
}


export interface ScaleEvalCase extends GoldenScaleCase {
  ranked: RankedHit[]
}


export function precisionAtKForCase(ranked: RankedHit[], expectedIds: string[], k: number): number {
  if (k <= 0) return 0
  const expected = new Set(expectedIds)
  let hits = 0
  for (const h of ranked.slice(0, k)) if (expected.has(h.note_id)) hits++
  return hits / k
}


export function coverageAtKForCase(ranked: RankedHit[], expectedIds: string[], k: number): number {
  return recallAtKForCase(ranked, expectedIds, k)
}


export function ndcgAtKForCase(ranked: RankedHit[], expectedIds: string[], k: number): number {
  if (expectedIds.length === 0) return 1
  const expected = new Set(expectedIds)
  let dcg = 0
  const topK = ranked.slice(0, k)
  for (let j = 0; j < topK.length; j++) {
    if (expected.has(topK[j].note_id)) dcg += 1 / Math.log2(j + 2) 
  }
  const ideal = Math.min(expected.size, k)
  let idcg = 0
  for (let j = 0; j < ideal; j++) idcg += 1 / Math.log2(j + 2)
  return idcg === 0 ? 1 : dcg / idcg
}


export function mrrForCase(ranked: RankedHit[], expectedIds: string[]): number {
  if (expectedIds.length === 0) return 1
  const rank = firstRelevantRank(ranked, new Set(expectedIds))
  return rank > 0 ? 1 / rank : 0
}


export function factHitForCase(
  ranked: RankedHit[],
  expected: { note_ids: string[]; expected_substring?: string },
  k: number,
): boolean | null {
  if (!expected.expected_substring) return null
  const needle = normalizeText(expected.expected_substring)
  const ids = new Set(expected.note_ids)
  for (const h of ranked.slice(0, k)) {
    if (!ids.has(h.note_id)) continue
    if (h.content && normalizeText(h.content).includes(needle)) return true
  }
  return false
}


function rankOf(ranked: RankedHit[], id: string): number {
  for (let i = 0; i < ranked.length; i++) if (ranked[i].note_id === id) return i + 1
  return 0
}


export function distractorRobustnessForCase(
  ranked: RankedHit[],
  expectedIds: string[],
  distractorId: string | undefined,
): boolean | null {
  if (!distractorId) return null
  const needleRank = firstRelevantRank(ranked, new Set(expectedIds))
  if (needleRank === 0) return false
  const distractorRank = rankOf(ranked, distractorId)
  if (distractorRank === 0) return true
  return needleRank < distractorRank
}

export interface ScaleMetrics {
  cases: number
  recall_at_8: number
  recall_at_20: number
  precision_at_8: number
  mrr: number
  ndcg_at_8: number
  ndcg_at_20: number
  fact_hit: number
  fact_hit_cases: number
  distractor_robustness: number
  distractor_cases: number
}

export interface ScaleReport {
  overall: ScaleMetrics
  byClass: Partial<Record<QueryClass, ScaleMetrics>>
}


function aggregate(cases: ScaleEvalCase[]): ScaleMetrics {
  const n = cases.length
  let r8 = 0, r20 = 0, p8 = 0, p8n = 0, mrr = 0, nd8 = 0, nd20 = 0
  let fhHits = 0, fhCases = 0, drHits = 0, drCases = 0
  for (const c of cases) {
    r8 += recallAtKForCase(c.ranked, c.expected_note_ids, 8)
    r20 += recallAtKForCase(c.ranked, c.expected_note_ids, 20)
    
    
    if (c.expected_note_ids.length > 0) { p8 += precisionAtKForCase(c.ranked, c.expected_note_ids, 8); p8n++ }
    mrr += mrrForCase(c.ranked, c.expected_note_ids)
    nd8 += ndcgAtKForCase(c.ranked, c.expected_note_ids, 8)
    nd20 += ndcgAtKForCase(c.ranked, c.expected_note_ids, 20)
    const fh = factHitForCase(c.ranked, { note_ids: c.expected_note_ids, expected_substring: c.expected_substring }, 8)
    if (fh !== null) { fhCases++; if (fh) fhHits++ }
    const dr = distractorRobustnessForCase(c.ranked, c.expected_note_ids, c.distractor_note_id)
    if (dr !== null) { drCases++; if (dr) drHits++ }
  }
  return {
    cases: n,
    recall_at_8: n ? r8 / n : 1,
    recall_at_20: n ? r20 / n : 1,
    precision_at_8: p8n ? p8 / p8n : 1,
    mrr: n ? mrr / n : 1,
    ndcg_at_8: n ? nd8 / n : 1,
    ndcg_at_20: n ? nd20 / n : 1,
    fact_hit: fhCases ? fhHits / fhCases : 1,
    fact_hit_cases: fhCases,
    distractor_robustness: drCases ? drHits / drCases : 1,
    distractor_cases: drCases,
  }
}

export function computeScaleMetrics(cases: ScaleEvalCase[]): ScaleReport {
  const byClass: Partial<Record<QueryClass, ScaleMetrics>> = {}
  const classes = [...new Set(cases.map((c) => c.class))] as QueryClass[]
  for (const cls of classes) byClass[cls] = aggregate(cases.filter((c) => c.class === cls))
  return { overall: aggregate(cases), byClass }
}


export function formatScaleReport(r: ScaleReport): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  const line = (label: string, m: ScaleMetrics, cls?: QueryClass): string => {
    const covLabel = cls === 'aggregate' || cls === 'cross_doc' ? 'cobertura' : 'recall'
    return [
      `${label} (n=${m.cases})`,
      `${covLabel}@8=${pct(m.recall_at_8)}`,
      `${covLabel}@20=${pct(m.recall_at_20)}`,
      `prec@8=${pct(m.precision_at_8)}`,
      `MRR=${m.mrr.toFixed(3)}`,
      `nDCG@8=${pct(m.ndcg_at_8)}`,
      `nDCG@20=${pct(m.ndcg_at_20)}`,
      `fact_hit=${pct(m.fact_hit)}(${m.fact_hit_cases})`,
      `distr_robust=${pct(m.distractor_robustness)}(${m.distractor_cases})`,
    ].join('  ')
  }
  const parts = [line('overall', r.overall)]
  for (const cls of Object.keys(r.byClass) as QueryClass[]) {
    parts.push(line(cls, r.byClass[cls]!, cls))
  }
  return parts.join('\n')
}



























export function ruidoDaNegativaForCase(ranked: RankedHit[]): number {
  return ranked.length
}

export interface RuidoNegativas {
  
  casos: number
  
  hitsPorCaso: number[]
  
  mediaDeHits: number
  
  fracaoVazia: number
}


export function calcularRuidoDasNegativas(cases: ScaleEvalCase[]): RuidoNegativas {
  const negativas = cases.filter((c) => c.class === 'negative')
  const hitsPorCaso = negativas.map((c) => ruidoDaNegativaForCase(c.ranked))
  const casos = negativas.length
  const somaHits = hitsPorCaso.reduce((a, b) => a + b, 0)
  const vazias = hitsPorCaso.filter((h) => h === 0).length
  return {
    casos,
    hitsPorCaso,
    mediaDeHits: casos ? somaHits / casos : 0,
    fracaoVazia: casos ? vazias / casos : 1,
  }
}


export function formatRuidoDasNegativas(r: RuidoNegativas): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  return `negativas (n=${r.casos})  hits_médios=${r.mediaDeHits.toFixed(2)}  vazio=${pct(r.fracaoVazia)}  hits_por_caso=[${r.hitsPorCaso.join(',')}]`
}
