import { join, dirname } from 'node:path'
import { writeFileSync, rmSync, mkdirSync } from 'node:fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { Octokit } from '@octokit/rest'
import { Decision } from './consolidate'
import { classifySensitivity, Operation } from './classify'
import { serializeNote } from '../note'

export type ApplyResult = { kind: 'noop' | 'commit' | 'pr'; ref?: string }
type Opts = { repoSlug?: string; octokit?: Octokit; pushRetries?: number; branchSuffix?: () => string; gitEmail?: string; gitName?: string }

export class Committer {
  private git: SimpleGit
  constructor(private dir: string, private opts: Opts = {}) { this.git = simpleGit(dir) }

  private identityReady = false
  private async ensureIdentity() {
    if (this.identityReady) return
    await this.git.addConfig('user.email', this.opts.gitEmail ?? 'brain@awave.ai')
                  .addConfig('user.name', this.opts.gitName ?? 'Awave Brain')
    this.identityReady = true
  }

  async apply(decision: Decision, ctx: { operation: Operation; touched: number }): Promise<ApplyResult> {
    await this.ensureIdentity()
    if (decision.action === 'ignore') return { kind: 'noop' }
    const path = decision.path!
    const sensitivity = classifySensitivity({ path, operation: ctx.operation, touched: ctx.touched })
    if (ctx.operation === 'delete') rmSync(join(this.dir, path), { force: true })
    else this.writeNoteFile(path, decision)
    return sensitivity === 'auto' ? this.autoCommit(path, decision.reason) : this.openPr(path, decision.reason)
  }

  async commitFile(path: string, message: string): Promise<ApplyResult> {
    await this.ensureIdentity()
    await this.git.add(path).commit(message)
    return this.pushWithRebase(path)
  }

  private writeNoteFile(path: string, d: Decision) {
    const abs = join(this.dir, path)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, serializeNote({ id: d.noteId!, title: d.title, type: 'semantic', tags: [], confidence: 0.6, links: [], path, body: d.body ?? '' }))
  }

  private async autoCommit(path: string, msg: string): Promise<ApplyResult> {
    await this.git.add(path).commit(`brain: ${msg}`)
    return this.pushWithRebase(path)
  }

  private async pushWithRebase(path: string, retries = this.opts.pushRetries ?? 3): Promise<ApplyResult> {
    for (let i = 0; i <= retries; i++) {
      try {
        await this.git.pull(['--rebase'])
        await this.git.push()
        return { kind: 'commit', ref: (await this.git.revparse(['HEAD'])).trim() }
      } catch {
        if (i === retries) return this.escalateToPr(path)
      }
    }
    return this.escalateToPr(path)
  }

  private async escalateToPr(path: string): Promise<ApplyResult> {
    const branch = this.branchName(path)
    await this.git.branch([branch])
    await this.git.push(['-u', 'origin', branch])
    const res = await this.createPr(branch, 'mudança escalada do auto-commit')
    await this.git.fetch('origin', 'main')
    await this.git.reset(['--hard', 'origin/main'])
    return res
  }

  private async openPr(path: string, reason: string): Promise<ApplyResult> {
    const branch = this.branchName(path)
    await this.git.checkoutLocalBranch(branch)
    await this.git.add(path).commit(`brain: ${reason}`)
    await this.git.push(['-u', 'origin', branch])
    const res = await this.createPr(branch, reason)
    await this.git.checkout('main')
    return res
  }

  private branchName(path: string) {
    const suffix = (this.opts.branchSuffix ?? (() => String(Date.now())))()
    return `curator/${suffix}-${path.replace(/\W+/g, '-')}`
  }

  private async createPr(branch: string, title: string): Promise<ApplyResult> {
    if (!this.opts.octokit || !this.opts.repoSlug) return { kind: 'pr', ref: branch }
    const [owner, repo] = this.opts.repoSlug.split('/')
    const pr = await this.opts.octokit.pulls.create({ owner, repo, head: branch, base: 'main', title: `[brain] ${title}` })
    return { kind: 'pr', ref: pr.data.html_url }
  }
}
