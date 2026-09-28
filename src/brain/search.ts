import { SupabaseClient } from '@supabase/supabase-js'
import { Embedder } from './embeddings'

const DAY = 86_400_000, HALF_LIFE_DAYS = 30
export function decayScore(n: { updated: string; last_accessed: string | null; access_count: number; confidence: number }, now: number): number {
  const sinceAccess = (now - Date.parse(n.last_accessed ?? n.updated)) / DAY
  const recency = Math.exp(-Math.max(0, sinceAccess) / HALF_LIFE_DAYS)
  const popularity = 1 + Math.log1p(n.access_count) * 0.1
  return (0.5 + 0.5 * n.confidence) * recency * popularity
}

export type SearchHit = { note_id: string; path: string; title: string | null; content: string; score: number }

export class Search {
  constructor(private db: SupabaseClient, private embedder: Embedder) {}
  async search(query: string, limit = 10): Promise<SearchHit[]> {
    const [emb] = await this.embedder.embedAll([query])
    const { data: hits, error: rpcErr } = await this.db.rpc('hybrid_search', { query_text: query, query_embedding: emb, match_count: limit * 2 })
    if (rpcErr) throw new Error(`hybrid_search: ${rpcErr.message}`)
    if (!hits?.length) return []
    const ids = [...new Set(hits.map((h: any) => h.note_id))]
    const { data: notes, error: selErr } = await this.db.from('notes').select('*').in('id', ids)
    if (selErr) throw new Error(`select notes: ${selErr.message}`)
    const byId = new Map((notes ?? []).map(n => [n.id, n]))
    const now = Date.now()
    const best = new Map<string, SearchHit>()
    for (const h of hits as any[]) {
      const n = byId.get(h.note_id); if (!n) continue
      const final = h.score * decayScore(n, now)
      const prev = best.get(h.note_id)
      if (!prev || final > prev.score) best.set(h.note_id, { note_id: n.id, path: n.path, title: n.title, content: h.content, score: final })
    }
    const out = [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit)
    await Promise.all(out.map(o => this.db.rpc('increment_access', { p_id: o.note_id })))
    return out
  }
}
