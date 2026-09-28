import { SupabaseClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { BrainRepo } from '../repo'
import { Search } from '../search'
import { consolidate, DecideClient } from './consolidate'
import { Committer } from './commit'
import { pendingCandidates, resolveCandidate } from './candidates'
import { buildIndex } from '../index-md'

export class Curator {
  constructor(
    private db: SupabaseClient,
    private repo: BrainRepo,
    private search: Pick<Search, 'search'>,
    private llm: DecideClient,
    private committer: Committer,
  ) {}

  private async resolve(id: number, status: string, result: object) {
    const { error } = await resolveCandidate(this.db, id, status, result)
    if (error) throw new Error(`resolveCandidate ${id} -> ${status}: ${error.message}`)
  }

  async run(): Promise<void> {
    const { data: candidates, error } = await pendingCandidates(this.db)
    if (error) throw new Error(`pendingCandidates: ${error.message}`)
    let changed = false
    for (const c of candidates ?? []) {
      try {
        const related = (await this.search.search(c.raw_content, 5)).map(h => ({ id: h.note_id, path: h.path, body: h.content }))
        const decision = await consolidate({ candidate: c, related }, this.llm)
        if (decision.action === 'ignore') {
          await this.resolve(c.id, 'ignored', { ...decision })
          continue
        }
        const operation = decision.action === 'merge' ? 'update' : 'create'
        const result = await this.committer.apply(decision, { operation, touched: 1 })
        await this.resolve(c.id, decision.action === 'merge' ? 'merged' : 'created', { ...decision, result })
        if (result.kind === 'commit') changed = true
      } catch (e) {
        
        try { await resolveCandidate(this.db, c.id, 'error', { error: String(e) }) } catch {  }
      }
    }
    if (changed) await this.regenerateIndex()
  }

  private async regenerateIndex(): Promise<void> {
    await this.repo.pull()
    const notes = await this.repo.listNotes()
    const indexPath = join(this.repo.dir, 'INDEX.md')
    const next = buildIndex(notes)
    const current = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : ''
    if (next === current) return                 
    writeFileSync(indexPath, next)
    await this.committer.commitFile('INDEX.md', 'brain: atualiza INDEX.md')  
  }
}
