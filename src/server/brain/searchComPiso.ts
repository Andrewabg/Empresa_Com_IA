
import type { SupabaseClient } from '@supabase/supabase-js'
import { Search, decayScore, type SearchHit } from '@/brain/search'
import type { Embedder } from '@/brain/embeddings'
import { PISO_DISTANCIA_PADRAO, passaNoPiso } from '@/lib/brain/pisoEDiversidade'

interface HitScored {
  note_id: string; chunk_index: number; content: string; score: number; distancia: number | null
}

interface NotaDb {
  id: string; path: string; title: string | null; updated: string
  last_accessed: string | null; access_count: number; confidence: number
}

export class SearchComPiso extends Search {
  private readonly bd: SupabaseClient
  private readonly emb: Embedder
  private readonly opts: { piso?: number }

  constructor(
    bd: SupabaseClient,
    embedder: Embedder,
    opts: { piso?: number } = {},
  ) {
    super(bd, embedder)
    this.bd = bd
    this.emb = embedder
    this.opts = opts
  }

  async search(query: string, limit = 10): Promise<SearchHit[]> {
    const piso = this.opts.piso ?? PISO_DISTANCIA_PADRAO

    const [emb] = await this.emb.embedAll([query])
    const { data: hits, error: rpcErr } = await this.bd.rpc('hybrid_search_scored', {
      query_text: query, query_embedding: emb, match_count: limit * 2,
    })
    if (rpcErr) throw new Error(`hybrid_search_scored: ${rpcErr.message}`)
    if (!hits?.length) return []

    const filtrados = (hits as HitScored[]).filter((h) => passaNoPiso(h.distancia, piso))
    if (!filtrados.length) return []

    const ids = [...new Set(filtrados.map((h) => h.note_id))]
    const { data: notes, error: selErr } = await this.bd.from('notes').select('*').in('id', ids)
    if (selErr) throw new Error(`select notes: ${selErr.message}`)
    const byId = new Map((notes ?? []).map((n: NotaDb) => [n.id, n]))

    const now = Date.now()
    const best = new Map<string, SearchHit>()
    for (const h of filtrados) {
      const n = byId.get(h.note_id)
      if (!n) continue
      const final = h.score * decayScore(n, now)
      const prev = best.get(h.note_id)
      if (!prev || final > prev.score) {
        best.set(h.note_id, { note_id: n.id, path: n.path, title: n.title, content: h.content, score: final })
      }
    }
    const out = [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit)
    if (!out.length) return out
    
    try {
      await this.bd.rpc('increment_access_many', { p_ids: out.map((o) => o.note_id) })
    } catch (e) { console.warn('[SearchComPiso] increment_access_many fail-open:', e) }
    return out
  }
}
