
import { statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import simpleGit from 'simple-git'
import type { BrainRepo } from '@/brain/repo'
import { planejarResgateMd, type ArquivoDoRepo, type Renomeacao } from '@/lib/brain/notaExtensao'


export const RESGATE_MAX_POR_PASSADA = 200


const HEAD_BYTES = 2048


const MAX_BYTES = 1024 * 1024


const FORA = ['.git/', 'evals/']

export interface ResgateDeps {
  
  listarVersionados?: (dir: string) => Promise<string[]>
  
  lerCabeca?: (dir: string, path: string) => string | null
  
  renomear?: (dir: string, de: string, para: string) => Promise<void>
  
  commitar?: (dir: string, msg: string) => Promise<string>
  
  publicar?: (dir: string) => Promise<void>
}

export type ResgateResult =
  | { status: 'noop' }
  | { status: 'ok'; renomeadas: Renomeacao[]; ref?: string; publicado: boolean }
  | { status: 'failed'; error: string }

async function listarVersionadosReal(dir: string): Promise<string[]> {
  const raw = await simpleGit(dir).raw(['ls-files', '-z'])
  return raw.split('\0').filter(Boolean).map((p) => p.replaceAll('\\', '/'))
}

function lerCabecaReal(dir: string, path: string): string | null {
  try {
    const abs = join(dir, path)
    if (statSync(abs).size > MAX_BYTES) return null
    return readFileSync(abs, 'utf8').slice(0, HEAD_BYTES)
  } catch {
    return null
  }
}

async function renomearReal(dir: string, de: string, para: string): Promise<void> {
  await simpleGit(dir).raw(['mv', de, para])
}

async function commitarReal(dir: string, msg: string): Promise<string> {
  const git = simpleGit(dir)
  
  
  await git.raw(['-c', 'user.email=brain@awave.local', '-c', 'user.name=Awave Brain', 'commit', '-m', msg])
  return (await git.revparse(['HEAD'])).trim()
}

async function publicarReal(dir: string): Promise<void> {
  const git = simpleGit(dir)
  await git.pull(['--rebase'])
  await git.push()
}


export async function resgatarNotasSemMd(
  repo: BrainRepo,
  deps: ResgateDeps = {},
): Promise<ResgateResult> {
  const listar = deps.listarVersionados ?? listarVersionadosReal
  const ler = deps.lerCabeca ?? lerCabecaReal
  const mover = deps.renomear ?? renomearReal
  const commitar = deps.commitar ?? commitarReal
  const publicar = deps.publicar ?? publicarReal
  try {
    const versionados = await listar(repo.dir)
    
    
    const candidatos = versionados.filter(
      (p) => !p.endsWith('.md') && !FORA.some((prefixo) => p.startsWith(prefixo)),
    )
    if (candidatos.length === 0) return { status: 'noop' }

    const arquivos: ArquivoDoRepo[] = []
    for (const path of candidatos) {
      const conteudo = ler(repo.dir, path)
      if (conteudo !== null) arquivos.push({ path, conteudo })
    }
    
    
    const jaMd = versionados.filter((p) => p.endsWith('.md')).map((p) => ({ path: p, conteudo: '' }))
    const plano = planejarResgateMd([...arquivos, ...jaMd]).slice(0, RESGATE_MAX_POR_PASSADA)
    if (plano.length === 0) return { status: 'noop' }

    const renomeadas: Renomeacao[] = []
    for (const r of plano) {
      try {
        await mover(repo.dir, r.de, r.para)
        renomeadas.push(r)
      } catch (e) {
        
        console.warn(`[resgateNotasSemMd] falhou renomear ${r.de} (segue):`, e instanceof Error ? e.message : e)
      }
    }
    if (renomeadas.length === 0) return { status: 'noop' }

    const msg =
      `brain: resgata ${renomeadas.length} nota(s) gravada(s) sem .md\n\n` +
      'Notas commitadas sem a extensão ficam invisíveis à busca e ao INDEX ' +
      '(o Cérebro só lê **/*.md). A extensão não altera o id da nota.'
    
    const ref = await commitar(repo.dir, msg)
    let publicado = true
    try {
      await publicar(repo.dir)
    } catch (e) {
      
      
      publicado = false
      console.warn('[resgateNotasSemMd] push best-effort falhou (commit local mantido):', e instanceof Error ? e.message : e)
    }
    console.warn(`[resgateNotasSemMd] ${renomeadas.length} nota(s) resgatada(s) para .md`)
    return { status: 'ok', renomeadas, ref, publicado }
  } catch (e) {
    console.warn('[resgateNotasSemMd] fail-open:', e instanceof Error ? e.message : e)
    return { status: 'failed', error: e instanceof Error ? e.message : String(e) }
  }
}
