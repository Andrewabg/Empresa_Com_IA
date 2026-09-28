
import simpleGit from 'simple-git'
import { BrainRepo, type Diff } from '../../brain/repo'
import { isBoilerplateMarkdown } from '@/lib/brain-notes'
import { estaArquivada } from '@/lib/brain/arquivoDeNotas'


function avisarNaoNotas(skipped: string[], contexto: string): void {
  const inesperados = ignoradosInesperados(skipped)
  if (inesperados.length) {
    console.warn(
      `[ResilientBrainRepo] ${inesperados.length} arquivo(s) .md não são Notas válidas e foram ignorados (${contexto}): ${inesperados.join(', ')}`,
    )
  }
}


export function ignoradosInesperados(paths: string[]): string[] {
  return paths.filter((p) => !isBoilerplateMarkdown(p))
}

export class ResilientBrainRepo extends BrainRepo {
  
  private isValidNote(path: string): boolean {
    try {
      this.readNote(path)
      return true
    } catch {
      return false
    }
  }

  
  async listarIgnoradosInesperados(): Promise<string[]> {
    const all = (await super.listNotePaths()).filter((p) => !estaArquivada(p))
    return ignoradosInesperados(all.filter((p) => !this.isValidNote(p)))
  }

  
  override async listNotePaths(): Promise<string[]> {
    
    
    
    
    const all = (await super.listNotePaths()).filter((p) => !estaArquivada(p))
    const notes: string[] = []
    const skipped: string[] = []
    for (const p of all) (this.isValidNote(p) ? notes : skipped).push(p)
    avisarNaoNotas(skipped, 'indexação')
    return notes
  }

  
  override async changedFiles(fromSha: string, toSha: string): Promise<Diff> {
    const raw = await simpleGit(this.dir).raw(['diff', '--no-renames', '--name-status', fromSha, toSha])
    const diff: Diff = { added: [], modified: [], removed: [] }
    for (const line of raw.split('\n').filter(Boolean)) {
      const [status, file] = line.split('\t')
      if (!file?.endsWith('.md')) continue
      if (status === 'A') diff.added.push(file)
      else if (status === 'M') diff.modified.push(file)
      else if (status === 'D') diff.removed.push(file)
    }
    
    
    
    
    
    const adicionadas = diff.added.filter((p) => !estaArquivada(p))
    const modificadas = diff.modified.filter((p) => !estaArquivada(p))
    const skipped = [...adicionadas, ...modificadas].filter((p) => !this.isValidNote(p))
    avisarNaoNotas(skipped, 'diff incremental')
    return {
      added: adicionadas.filter((p) => this.isValidNote(p)),
      modified: modificadas.filter((p) => this.isValidNote(p)),
      removed: diff.removed,
    }
  }

  
  static override async clone(remote: string, dir: string, branch = 'main'): Promise<ResilientBrainRepo> {
    await simpleGit().clone(remote, dir, ['--branch', branch])
    return new ResilientBrainRepo(dir)
  }
}
