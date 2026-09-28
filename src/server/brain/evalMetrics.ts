










export type RankedHit = {
  
  note_id: string
  
  content?: string
}


export type ExpectedTarget = {
  
  note_ids: string[]
  
  chunk_substring?: string
}


export type EvalCase = {
  ranked: RankedHit[]
  expected: ExpectedTarget
}

export type EvalMetrics = {
  
  mrr: number
  
  recall_at_1: number
  recall_at_3: number
  recall_at_5: number
  
  chunk_hit: number
  
  chunk_cases: number
  
  cases: number
}


export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}


export function firstRelevantRank(ranked: RankedHit[], expectedIds: Set<string>): number {
  for (let i = 0; i < ranked.length; i++) {
    if (expectedIds.has(ranked[i].note_id)) return i + 1
  }
  return 0
}


export function recallAtKForCase(ranked: RankedHit[], expectedIds: string[], k: number): number {
  if (expectedIds.length === 0) return 1
  const topK = new Set(ranked.slice(0, k).map(h => h.note_id))
  let hits = 0
  for (const id of expectedIds) if (topK.has(id)) hits++
  return hits / expectedIds.length
}


export function chunkHitForCase(
  ranked: RankedHit[],
  expected: ExpectedTarget,
  k: number,
): boolean | null {
  if (!expected.chunk_substring) return null
  const needle = normalizeText(expected.chunk_substring)
  const expectedIds = new Set(expected.note_ids)
  for (const h of ranked.slice(0, k)) {
    if (!expectedIds.has(h.note_id)) continue
    if (h.content && normalizeText(h.content).includes(needle)) return true
  }
  return false
}


export function computeEvalMetrics(cases: EvalCase[], opts: { chunkK?: number } = {}): EvalMetrics {
  const chunkK = opts.chunkK ?? 5
  const n = cases.length

  let mrrSum = 0
  let r1 = 0
  let r3 = 0
  let r5 = 0
  let chunkHits = 0
  let chunkCases = 0

  for (const c of cases) {
    const expectedIds = new Set(c.expected.note_ids)
    const rank = firstRelevantRank(c.ranked, expectedIds)
    mrrSum += rank > 0 ? 1 / rank : 0

    r1 += recallAtKForCase(c.ranked, c.expected.note_ids, 1)
    r3 += recallAtKForCase(c.ranked, c.expected.note_ids, 3)
    r5 += recallAtKForCase(c.ranked, c.expected.note_ids, 5)

    const ch = chunkHitForCase(c.ranked, c.expected, chunkK)
    if (ch !== null) {
      chunkCases++
      if (ch) chunkHits++
    }
  }

  return {
    mrr: n ? mrrSum / n : 1,
    recall_at_1: n ? r1 / n : 1,
    recall_at_3: n ? r3 / n : 1,
    recall_at_5: n ? r5 / n : 1,
    chunk_hit: chunkCases ? chunkHits / chunkCases : 1,
    chunk_cases: chunkCases,
    cases: n,
  }
}


export function formatEvalMetrics(m: EvalMetrics): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  return [
    `casos=${m.cases}`,
    `MRR=${m.mrr.toFixed(3)}`,
    `recall@1=${pct(m.recall_at_1)}`,
    `recall@3=${pct(m.recall_at_3)}`,
    `recall@5=${pct(m.recall_at_5)}`,
    `chunk-hit=${pct(m.chunk_hit)} (${m.chunk_cases} casos)`,
  ].join('  ')
}






export type RagRankedHit = { note_id: string; content: string }


export function hitPorAncora(ranked: RagRankedHit[], anchors: string[], k: number): boolean {
  if (anchors.length === 0) return false
  const needles = anchors.map(normalizeText)
  for (const h of ranked.slice(0, k)) {
    const c = normalizeText(h.content ?? '')
    if (needles.some((nd) => nd.length > 0 && c.includes(nd))) return true
  }
  return false
}


export function rankPorAncora(ranked: RagRankedHit[], anchors: string[]): number {
  const needles = anchors.map(normalizeText).filter((n) => n.length > 0)
  for (let i = 0; i < ranked.length; i++) {
    const c = normalizeText(ranked[i].content ?? '')
    if (needles.some((nd) => c.includes(nd))) return i + 1
  }
  return 0
}


export function coberturaPorAncora(ranked: RagRankedHit[], anchors: string[], k: number): number {
  if (anchors.length === 0) return 1
  const blob = ranked.slice(0, k).map((h) => normalizeText(h.content ?? '')).join('\n')
  let achou = 0
  for (const a of anchors) {
    const nd = normalizeText(a)
    if (nd.length > 0 && blob.includes(nd)) achou++
  }
  return achou / anchors.length
}

export type RagTipo = 'secao_direta' | 'needle' | 'parafrase' | 'cross_nota' | 'armadilha_oca' | 'ambiguo'

export type RagEvalCase = {
  tipo: RagTipo
  anchors: string[]
  ranked: RagRankedHit[]
  trap_anchor?: string
  expected_note_ids?: string[]
}


export function ocaSupera(ranked: RagRankedHit[], anchors: string[], trapAnchor: string): boolean {
  const rBoa = rankPorAncora(ranked, anchors)
  if (rBoa === 0) return false
  const rTrap = rankPorAncora(ranked, [trapAnchor])
  return rTrap === 0 || rBoa < rTrap
}

export type RagMetrics = {
  cases: number
  recall: Record<string, number>
  mrr: number
  coverage: Record<string, number>
  oca_supera: number
  porTipo: Record<string, { cases: number; recall: Record<string, number>; mrr: number }>
}

export function computeRagMetrics(cases: RagEvalCase[], opts: { ks?: number[] } = {}): RagMetrics {
  const ks = opts.ks ?? [5, 10, 20]
  const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 1)

  const recall: Record<string, number> = {}
  for (const k of ks) recall[String(k)] = media(cases.map((c) => (hitPorAncora(c.ranked, c.anchors, k) ? 1 : 0)))
  const mrr = media(cases.map((c) => { const r = rankPorAncora(c.ranked, c.anchors); return r ? 1 / r : 0 }))

  const cross = cases.filter((c) => c.tipo === 'cross_nota')
  const coverage: Record<string, number> = {}
  for (const k of ks) coverage[String(k)] = media(cross.map((c) => coberturaPorAncora(c.ranked, c.anchors, k)))

  const ocas = cases.filter((c) => c.tipo === 'armadilha_oca')
  const oca_supera = media(ocas.map((c) => (ocaSupera(c.ranked, c.anchors, c.trap_anchor ?? '') ? 1 : 0)))

  const porTipo: RagMetrics['porTipo'] = {}
  for (const t of new Set(cases.map((c) => c.tipo))) {
    const cs = cases.filter((c) => c.tipo === t)
    const rk: Record<string, number> = {}
    for (const k of ks) rk[String(k)] = media(cs.map((c) => (hitPorAncora(c.ranked, c.anchors, k) ? 1 : 0)))
    porTipo[t] = { cases: cs.length, recall: rk, mrr: media(cs.map((c) => { const r = rankPorAncora(c.ranked, c.anchors); return r ? 1 / r : 0 })) }
  }

  return { cases: cases.length, recall, mrr, coverage, oca_supera, porTipo }
}

export function formatRagMetrics(m: RagMetrics): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  const linhas: string[] = [
    `casos=${m.cases}  MRR=${m.mrr.toFixed(3)}  recall@5=${pct(m.recall['5'])} @10=${pct(m.recall['10'] ?? m.recall['5'])} @20=${pct(m.recall['20'] ?? m.recall['5'])}`,
    `coverage@5(cross_nota)=${pct(m.coverage['5'])}  oca_supera=${pct(m.oca_supera)}`,
    `-- por tipo --`,
  ]
  for (const [t, v] of Object.entries(m.porTipo)) {
    linhas.push(`  ${t.padEnd(14)} n=${v.cases}  recall@5=${pct(v.recall['5'])}  MRR=${v.mrr.toFixed(3)}`)
  }
  return linhas.join('\n')
}
