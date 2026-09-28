import simpleGit, { SimpleGit } from 'simple-git'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import fg from 'fast-glob'
import { parseNote, Note } from './note'

export type Diff = { added: string[]; modified: string[]; removed: string[] }

export class BrainRepo {
  private git: SimpleGit
  constructor(public readonly dir: string) { this.git = simpleGit(dir) }

  static async clone(remote: string, dir: string, branch = 'main'): Promise<BrainRepo> {
    await simpleGit().clone(remote, dir, ['--branch', branch])
    return new BrainRepo(dir)
  }
  async pull() { await this.git.pull() }
  async headSha(): Promise<string> { return (await this.git.revparse(['HEAD'])).trim() }

  async listNotePaths(): Promise<string[]> {
    const paths = await fg('**/*.md', { cwd: this.dir, dot: false })
    return paths.map(p => p.replaceAll('\\', '/')).filter(p => p !== 'INDEX.md' && !p.startsWith('evals/'))
  }
  readNote(path: string): Note { return parseNote(path, readFileSync(join(this.dir, path), 'utf8')) }
  async listNotes(): Promise<Note[]> { return (await this.listNotePaths()).map(p => this.readNote(p)) }

  async changedFiles(fromSha: string, toSha: string): Promise<Diff> {
    const raw = await this.git.raw(['diff', '--name-status', fromSha, toSha])
    const diff: Diff = { added: [], modified: [], removed: [] }
    for (const line of raw.split('\n').filter(Boolean)) {
      const [status, file] = line.split('\t')
      if (!file?.endsWith('.md')) continue
      if (status === 'A') diff.added.push(file)
      else if (status === 'M') diff.modified.push(file)
      else if (status === 'D') diff.removed.push(file)
    }
    return diff
  }
}
