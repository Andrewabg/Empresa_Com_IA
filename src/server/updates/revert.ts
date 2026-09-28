


import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import simpleGit from 'simple-git'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getSetting } from '@/data/settings'
import { setUpdateState } from '@/server/updates/status'
import { sanitizeUpdateError, UPDATE_LAST_COMMIT_KEY } from '@/server/updates/apply'
import { getStamp } from '@/server/stamp'

export interface RevertDeps {
  revertCommit?: (sha: string) => Promise<void> 
  nowIso?: () => string
}


async function defaultRevertCommit(sha: string): Promise<void> {
  const [token, repo] = await Promise.all([
    getSecret(SECRET_KEYS.github_token),
    getSecret(SECRET_KEYS.update_repo),
  ])
  if (!token || !repo) throw new Error('Configure o repositório do Motor e o token do GitHub antes de reverter.')
  const cloneDir = await mkdtemp(join(tmpdir(), 'awave-revert-clone-'))
  try {
    const url = `https://x-access-token:${token}@github.com/${repo}.git`
    await simpleGit().clone(url, cloneDir) 
    const git = simpleGit(cloneDir)
    await git.addConfig('core.autocrlf', 'false')
    await git.addConfig('user.name', 'Awave Updater')
    await git.addConfig('user.email', 'updater@awave.local')
    await git.raw(['revert', '--no-edit', sha]) 
    await git.push()
  } finally {
    await rm(cloneDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function revertUpdate(deps: RevertDeps = {}): Promise<void> {
  const nowIso = deps.nowIso ?? (() => new Date().toISOString())
  const revertCommit = deps.revertCommit ?? defaultRevertCommit
  const sha = await getSetting(UPDATE_LAST_COMMIT_KEY)
  
  
  
  
  
  
  
  
  const target = getStamp()?.ref ?? 'anterior'
  try {
    if (!sha) {
      throw new Error('Não sei com segurança qual atualização reverter — reverta manual (DEPLOY.md).')
    }
    await setUpdateState({ phase: 'publicando', target, at: nowIso() }) 
    await revertCommit(sha)
    await setUpdateState({ phase: 'aguardando_rebuild', target, at: nowIso() })
  } catch (err) {
    await setUpdateState({
      phase: 'erro', target, at: nowIso(),
      error: sanitizeUpdateError(err instanceof Error ? err.message : String(err)),
    })
    throw err
  }
}
