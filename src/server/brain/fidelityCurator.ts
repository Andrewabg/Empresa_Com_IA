
import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import simpleGit from 'simple-git'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Octokit } from '@octokit/rest'
import { Curator } from '@/brain/curator/curator'
import type { BrainRepo } from '@/brain/repo'
import type { Search } from '@/brain/search'
import type { DecideClient, Decision } from '@/brain/curator/consolidate'
import type { Committer, ApplyResult } from '@/brain/curator/commit'
import { pendingCandidates, resolveCandidate } from '@/brain/curator/candidates'
import { podeVirarMemoriaDuravel } from '@/lib/memory/origemDaCandidata'
import { MOTIVO_ORIGEM_RECUSADA, reivindicarCandidata, CLAIM_FRIO_MS } from './candidatasElegiveis'
import {
  listRetryableCandidates, claimErrorCandidate, markCandidateFailure, countDeadCandidates,
  CURATOR_MAX_ATTEMPTS, CURATOR_RETRY_BACKOFF_MS, type RetryCandidate,
} from '@/data/curatorRetry'
import { classificarSensibilidade } from './sensibilidadeDaPasta'
import { pathsComPrPendente } from './prPendenteNoPath'
import { buildIndex } from '@/brain/index-md'
import type { MemoryCandidate } from '@/db/types'
import { NoteWriter } from './noteWriter'
import type { MergeCritic, MergeCriticVerdict, MergeCriticInput } from './mergeCritic'
import { openPrForPath } from './escalatePr'
import { withCloneLock } from './cloneLock'
import { buildMergePrompt, buildRetryPrompt, derivePastas, type RelatedNote, type PastaExistente } from '@/lib/brain-merge-prompt'
import { validateMerge, describeViolation } from '@/lib/brain-merge-gate'
import { deveAuditarMerge, contemMarcaDeOmissao } from '@/lib/brain-merge-audit'
import { mergeFrontmatter, type WriteIntent } from '@/lib/brain-frontmatter'
import { sourceLabel, type ImportFilenames } from '@/lib/brain-source'
import { normalizeNotePath } from '@/lib/brain/notaExtensao'
import { getImportWithFiles } from '@/data/imports'


interface CuratorContext {
  pastas?: PastaExistente[]
  importFilenames?: ImportFilenames
  
  prsPendentes?: Set<string>
}


export class FidelityCurator extends Curator {
  constructor(
    private db2: SupabaseClient,
    private repo2: BrainRepo,
    private search2: Pick<Search, 'search'>,
    private llm2: DecideClient,
    private committer2: Committer,
    private writer: NoteWriter,
    private critic: MergeCritic,
    private octokit?: Octokit,
    private repoSlug?: string,
    private branchSuffix?: () => string,
    
    
    
    private now: () => number = () => Date.now(),
  ) {
    super(db2, repo2, search2, llm2, committer2)
  }

  override async run(): Promise<void> {
    let changed = false

    
    
    const pastas = await this.pastasSnapshot()
    const prsPendentes = await this.prsPendentesSnapshot()

    
    
    
    
    
    
    const { data: candidates, error } = await pendingCandidates(this.db2)
    if (error) throw new Error(`pendingCandidates: ${error.message}`)
    for (const c of (candidates ?? []) as RetryCandidate[]) {
      const minha = await this.reivindicar(c)
      if (!minha) continue
      if ((await this.processCandidate(minha, { pastas, prsPendentes })).committed) changed = true
    }

    
    
    
    
    
    
    try {
      const cutoff = new Date(this.now() - CURATOR_RETRY_BACKOFF_MS).toISOString()
      const retryables = await listRetryableCandidates(this.db2, cutoff, 25, CURATOR_MAX_ATTEMPTS)
      for (const c of retryables) {
        
        
        
        
        
        
        
        if (!podeVirarMemoriaDuravel(c.origin_class)) {
          await resolveCandidate(this.db2, c.id, 'descartada', { motivo: MOTIVO_ORIGEM_RECUSADA })
          continue
        }
        
        
        
        
        const claimed = await claimErrorCandidate(this.db2, c.id) 
        if (!claimed) continue 
        if ((await this.processCandidate(claimed, { pastas, prsPendentes })).committed) changed = true
      }
    } catch (e) {
      console.warn('[FidelityCurator] passada de retry falhou (fail-open, segue):', e)
    }

    if (changed) await this.regenIndex()

    
    
    
    try {
      const dead = await countDeadCandidates(this.db2)
      if (dead > 0) console.warn(`[FidelityCurator] ${dead} candidata(s) em dead-letter (retry esgotado) — memória não promovida a nota git`)
    } catch {  }
  }

  
  private async reivindicar(c: RetryCandidate): Promise<RetryCandidate | null> {
    const agora = this.now()
    try {
      const linha = await reivindicarCandidata(
        this.db2, c.id, new Date(agora).toISOString(), new Date(agora - CLAIM_FRIO_MS).toISOString(),
      )
      return (linha as RetryCandidate | null) ?? null
    } catch (e) {
      console.warn(`[FidelityCurator] claim da candidata ${c.id} falhou; ela fica para a próxima passada:`, e)
      return null
    }
  }

  
  private async processCandidate(c: RetryCandidate, ctx: CuratorContext = {}): Promise<{ committed: boolean; ref?: string }> {
    try {
      
      
      
      
      const related = await this.relatedNotes(c.raw_content)
      
      
      const prompt = buildMergePrompt({
        candidate: { raw_content: c.raw_content, suggested_type: c.suggested_type, suggested_tags: c.suggested_tags ?? [] },
        related,
        pastasExistentes: ctx.pastas,
      })
      const decision = await this.llm2.decide(prompt)
      
      
      
      
      
      if (decision.path) decision.path = normalizeNotePath(decision.path)
      if (decision.action === 'ignore') { await this.resolveStatus(c.id, 'ignored', { ...decision }); return { committed: false } }
      
      
      
      
      
      
      
      if (decision.path && ctx.prsPendentes?.has(decision.path)) {
        console.info(`[FidelityCurator] candidata ${c.id} segurada: ${decision.path} tem pedido esperando decisão`)
        return { committed: false }
      }
      const result = decision.action === 'merge'
        ? await this.applyMerge(c, decision, prompt, ctx.importFilenames)
        : await this.applyCreate(c, decision, ctx.importFilenames)
      
      
      
      
      if (result.kind === 'pr' && decision.path) ctx.prsPendentes?.add(decision.path)
      await this.resolveStatus(c.id, decision.action === 'merge' ? 'merged' : 'created', { ...decision, result })
      return { committed: result.kind === 'commit', ref: result.ref }
    } catch (e) {
      
      
      
      try { await markCandidateFailure(this.db2, c.id, c.attempts ?? 0, String(e)) } catch {  }
      
      
      
      
      
      
      
      
      const dirtyPath = (e as { brainDirtyPath?: string })?.brainDirtyPath
      try {
        await withCloneLock(async () => {
          const git = simpleGit(this.repo2.dir)
          if (dirtyPath) {
            
            try { await git.checkout(['--', dirtyPath]) } catch {  }
          } else {
            
            await git.reset(['--hard', 'HEAD'])
          }
          await git.checkout('main')
        })
      } catch {  }
      return { committed: false }
    }
  }

  
  async drainImport(limit: number): Promise<{ processed: number; shasByImport: Record<string, string[]> }> {
    const { data, error } = await this.db2
      .from('memory_candidates')
      .select('*')
      .eq('status', 'pending_import')
      .order('id', { ascending: true })
      .limit(limit)
    if (error) throw new Error(`drainImport select: ${error.message}`)
    const candidatas = (data ?? []) as RetryCandidate[]

    
    
    
    const pastas = await this.pastasSnapshot()
    const prsPendentes = await this.prsPendentesSnapshot()
    const importFilenames = await this.resolveImportFilenames(candidatas)

    const shasByImport: Record<string, string[]> = {}
    let changed = false
    for (const c of candidatas) {
      const r = await this.processCandidate(c, { pastas, importFilenames, prsPendentes })
      if (r.committed) changed = true
      if (r.committed && r.ref && c.source_ref) {
        ;(shasByImport[c.source_ref] ??= []).push(r.ref)
      }
    }
    if (changed) await this.regenIndex()
    return { processed: (data ?? []).length, shasByImport }
  }

  private async relatedNotes(query: string): Promise<RelatedNote[]> {
    const hits = await this.search2.search(query, 5)
    return hits.map(h => {
      
      
      
      const onDisk = existsSync(join(this.repo2.dir, h.path)) ? this.repo2.readNote(h.path) : null
      return {
        id: h.note_id,
        path: h.path,
        body: onDisk ? onDisk.body : h.content,
        title: onDisk?.title ?? h.title ?? undefined,
        tags: onDisk?.tags ?? undefined,
      }
    })
  }

  
  private async pastasSnapshot(): Promise<PastaExistente[]> {
    try {
      const paths = await this.repo2.listNotePaths()
      return derivePastas(paths)
    } catch {
      return []
    }
  }

  
  private async prsPendentesSnapshot(): Promise<Set<string>> {
    try {
      return await pathsComPrPendente(this.db2)
    } catch (e) {
      console.warn('[FidelityCurator] não consegui ler os PRs pendentes (fail-open, segue):', e)
      return new Set()
    }
  }

  
  private async resolveImportFilenames(cands: RetryCandidate[]): Promise<ImportFilenames> {
    const ids = [...new Set(cands.filter(c => c.source_type === 'import' && c.source_ref).map(c => c.source_ref as string))]
    const map: ImportFilenames = {}
    for (const id of ids) {
      try {
        const found = await getImportWithFiles(this.db2, id)
        if (found && found.files.length > 0) map[id] = found.files.map(f => f.filename)
      } catch {  }
    }
    return map
  }

  private intentFor(path: string, c: MemoryCandidate, decision: Decision, importFilenames: ImportFilenames = {}): WriteIntent {
    return {
      path,
      title: decision.title,
      suggestedTags: c.suggested_tags ?? [],
      authorAgent: c.author_agent ?? undefined,
      
      source: sourceLabel(c, importFilenames),
    }
  }

  private async applyCreate(c: MemoryCandidate, decision: Decision, importFilenames?: ImportFilenames): Promise<ApplyResult> {
    if (!decision.path) throw new Error('decisão de merge/create sem `path`')
    const path = decision.path
    
    
    
    return this.writeUnderLock(path, () => {
      this.writer.persist({ mode: 'create', body: decision.body ?? '', intent: this.intentFor(path, c, decision, importFilenames) })
      const route = classificarSensibilidade({ path, operation: 'create', touched: 1 })
      return route === 'pr' ? this.escalate(path, decision.reason) : this.commitFile(path, decision.reason)
    })
  }

  private async applyMerge(c: MemoryCandidate, decision: Decision, prompt: string, importFilenames?: ImportFilenames): Promise<ApplyResult> {
    if (!decision.path) throw new Error('decisão de merge/create sem `path`')
    const path = decision.path
    const before = existsSync(join(this.repo2.dir, path)) ? this.repo2.readNote(path) : null
    const intent = this.intentFor(path, c, decision, importFilenames)
    let body = decision.body ?? ''
    const fm = mergeFrontmatter(before, intent, 'merge')
    let gate = validateMerge(before, { body, frontmatter: fm }, c)

    
    
    
    
    
    
    let critic: MergeCriticVerdict = { lost_facts: [], duplicated_entities: [], placeholders: [], contradictions: [], verdict: 'clean' }
    if (deveAuditarMerge({ gateOk: gate.ok, beforeBody: before?.body, proposedBody: body })) {
      critic = await this.safeAudit({ before, candidate: c, proposed: { body } })

      if (!gate.ok || critic.verdict === 'fixable') {
        const violations = [...gate.violations.map(describeViolation), ...this.criticIssues(critic)]
        
        
        
        const integro = before && contemMarcaDeOmissao(body) ? before.body : undefined
        const retry = await this.llm2.decide(buildRetryPrompt(prompt, violations, integro))
        body = retry.body ?? body
        gate = validateMerge(before, { body, frontmatter: fm }, c)
        critic = await this.safeAudit({ before, candidate: c, proposed: { body } })
      }
    }

    const sensitive = classificarSensibilidade({ path, operation: 'update', touched: 1 }) === 'pr'
    const escalate = sensitive || !gate.ok || critic.verdict !== 'clean'
    decision.body = body   
    
    
    return this.writeUnderLock(path, () => {
      this.writer.persist({ mode: 'merge', body, intent })
      return escalate ? this.escalate(path, decision.reason) : this.commitFile(path, decision.reason)
    })
  }

  
  private async writeUnderLock(path: string, fn: () => Promise<ApplyResult>): Promise<ApplyResult> {
    return withCloneLock(async () => {
      try {
        return await fn()
      } catch (e) {
        
        if (e && typeof e === 'object') (e as { brainDirtyPath?: string }).brainDirtyPath = path
        throw e
      }
    })
  }

  private criticIssues(c: MergeCriticVerdict): string[] {
    return [
      ...c.lost_facts.map(x => `fato perdido: ${x}`),
      ...c.duplicated_entities.map(x => `entidade duplicada: ${x}`),
      ...c.placeholders.map(x => `placeholder: ${x}`),
      ...c.contradictions.map(x => `contradição: ${x}`),
    ]
  }

  
  private async safeAudit(input: MergeCriticInput): Promise<MergeCriticVerdict> {
    try {
      return await this.critic.audit(input)
    } catch (e) {
      return { lost_facts: [], duplicated_entities: [], placeholders: [], contradictions: [`crítico indisponível: ${String(e)}`], verdict: 'escalate' }
    }
  }

  private async commitFile(path: string, reason: string): Promise<ApplyResult> {
    return this.committer2.commitFile(path, `brain: ${reason}`)
  }

  private escalate(path: string, reason: string): Promise<ApplyResult> {
    return openPrForPath({ dir: this.repo2.dir, path, message: reason, octokit: this.octokit, repoSlug: this.repoSlug, branchSuffix: this.branchSuffix })
  }

  
  
  
  
  private async resolveStatus(id: number, status: string, result: object): Promise<void> {
    const { error } = await resolveCandidate(this.db2, id, status, result)
    if (error) throw new Error(`resolveCandidate ${id} -> ${status}: ${error.message}`)
  }

  private async regenIndex(): Promise<void> {
    
    
    await withCloneLock(async () => {
      await this.repo2.pull()
      const notes = await this.repo2.listNotes()
      const indexPath = join(this.repo2.dir, 'INDEX.md')
      const next = buildIndex(notes)
      const current = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : ''
      if (next === current) return
      writeFileSync(indexPath, next)
      await this.committer2.commitFile('INDEX.md', 'brain: atualiza INDEX.md')
    })
  }
}
