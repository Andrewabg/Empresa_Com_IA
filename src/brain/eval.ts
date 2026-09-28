import { Search } from './search'
export type GoldenCase = { query: string; expected_note_ids: string[] }
export async function recallAtK(search: Search, golden: GoldenCase[], k: number): Promise<number> {
  let hits = 0, total = 0
  for (const c of golden) {
    const got = new Set((await search.search(c.query, k)).map(h => h.note_id))
    for (const id of c.expected_note_ids) { total++; if (got.has(id)) hits++ }
  }
  return total ? hits / total : 1
}
