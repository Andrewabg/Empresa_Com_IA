
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import simpleGit from 'simple-git'
import { getBrain as _getBrain, NotConfiguredError } from '@/server/brain/runtime'



export interface EpochGitClient {
  addConfig: (k: string, v: string) => Promise<unknown>
  add: (a: string[]) => Promise<unknown>
  commit: (m: string) => Promise<unknown>
  pull: (a?: string[]) => Promise<unknown>
  push: () => Promise<unknown>
}

export interface EpochCerebroDeps {
  
  getBrain?: () => Promise<{ repo: { dir: string; listNotePaths: () => Promise<string[]> } }>
  
  rm?: (absPath: string) => void
  
  git?: (dir: string) => EpochGitClient
}



export interface EpochCerebroResult {
  ok: boolean
  removed: number
  reason?: string
}



const COMMIT_MESSAGE = 'Reset de fábrica: Cérebro zerado'
const GIT_EMAIL = 'brain@awave.ai'
const GIT_NAME = 'Awave Brain'

const PUSH_RETRIES = 3




function makeRealGit(dir: string): EpochGitClient {
  return simpleGit(dir, { timeout: { block: 20_000 } })
}


function defaultRm(absPath: string): void {
  rmSync(absPath, { force: true })
}


async function pushComRebase(git: EpochGitClient, tentativas = PUSH_RETRIES): Promise<void> {
  let ultimoErro: unknown
  for (let i = 0; i <= tentativas; i++) {
    try {
      await git.pull(['--rebase'])
      await git.push()
      return
    } catch (err) {
      ultimoErro = err
    }
  }
  throw ultimoErro
}




export async function epochCerebro(deps?: EpochCerebroDeps): Promise<EpochCerebroResult> {
  const resolverBrain = deps?.getBrain ?? _getBrain
  const rm = deps?.rm ?? defaultRm
  const makeGit = deps?.git ?? makeRealGit

  
  let brain: { repo: { dir: string; listNotePaths: () => Promise<string[]> } }
  try {
    brain = await resolverBrain()
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      
      return { ok: true, removed: 0, reason: 'nao-configurado' }
    }
    
    console.warn('[epochCerebro] getBrain falhou (não-fatal):', err instanceof Error ? err.message : err)
    return { ok: false, removed: 0, reason: 'brain-indisponivel' }
  }

  const { repo } = brain
  const dir = repo.dir

  try {
    
    const todasAsNotas = await repo.listNotePaths()
    
    const notasDeConhecimento = todasAsNotas.filter((p) => !p.startsWith('skills/'))

    if (notasDeConhecimento.length === 0) {
      return { ok: true, removed: 0, reason: 'ja-vazio' }
    }

    
    for (const notaRelativa of notasDeConhecimento) {
      rm(join(dir, notaRelativa))
    }

    
    const git = makeGit(dir)

    
    await git.addConfig('user.email', GIT_EMAIL)
    await git.addConfig('user.name', GIT_NAME)

    
    
    
    
    
    await git.add(notasDeConhecimento)
    await git.commit(COMMIT_MESSAGE)

    
    
    
    
    await pushComRebase(git)

    return { ok: true, removed: notasDeConhecimento.length }
  } catch (err) {
    
    const msg = err instanceof Error ? err.message : String(err)
    
    const msgSegura = msg.includes('@github.com') ? '[URL com token omitida]' : msg
    console.warn('[epochCerebro] Falha ao fazer epoch do Cérebro (não-fatal):', msgSegura)
    return { ok: false, removed: 0, reason: 'push-falhou' }
  }
}
