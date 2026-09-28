
import simpleGit from 'simple-git'

import { canUndo, revertOrder } from '@/lib/imports/undo'
import { withCloneLock } from '@/server/brain/cloneLock'
import { reconcileResilient } from '@/server/brain/reconcileResilient'
import { getImportWithFiles, setImportStatus } from '@/data/imports'
import type { Brain } from '@/server/brain/runtime'

export type UndoResult =
  | { ok: true; reverted: number }
  | { ok: false; reason: 'not_found' | 'nothing' | 'conflict' | 'error'; message: string }


export interface GitLike {
  addConfig(key: string, value: string): Promise<unknown> | unknown
  pull(args: string[]): Promise<unknown>
  push(): Promise<unknown>
  raw(args: string[]): Promise<unknown>
}

export interface UndoDeps {
  git?: (dir: string) => GitLike
  withLock?: typeof withCloneLock
  reconcile?: typeof reconcileResilient
  getImport?: typeof getImportWithFiles
  setStatus?: typeof setImportStatus
}


export async function undoImport(
  brain: Brain,
  importId: string,
  deps?: UndoDeps,
): Promise<UndoResult> {
  const mkGit = deps?.git ?? ((dir: string) => simpleGit(dir) as unknown as GitLike)
  const withLock = deps?.withLock ?? withCloneLock
  const reconcile = deps?.reconcile ?? reconcileResilient
  const getImport = deps?.getImport ?? getImportWithFiles
  const setStatus = deps?.setStatus ?? setImportStatus

  
  const info = await getImport(brain.db, importId)
  if (!info) {
    return { ok: false, reason: 'not_found', message: 'Lote não encontrado.' }
  }

  
  const shas = info.import.commit_shas ?? []
  if (!canUndo(info.import.status, shas.length)) {
    return { ok: false, reason: 'nothing', message: 'Nada a desfazer neste lote.' }
  }

  
  return withLock(async () => {
    const git = mkGit(brain.repo.dir)

    
    await git.addConfig('user.email', 'brain@awave.ai')
    await git.addConfig('user.name', 'Awave Brain')

    
    try {
      await git.pull(['--rebase'])
    } catch {
      
    }

    
    try {
      await git.raw(['revert', '--no-edit', ...revertOrder(shas)])
      await git.push()
    } catch {
      try {
        await git.raw(['revert', '--abort'])
      } catch {
        
      }
      return {
        ok: false,
        reason: 'conflict',
        message:
          'Não desfiz automático porque essas notas foram editadas depois. Revise manualmente na aba do Cérebro.',
      }
    }

    
    
    await reconcile(brain.db, brain.repo, brain.sync, brain.embedder.version())

    await setStatus(brain.db, importId, 'undone')

    return { ok: true, reverted: shas.length }
  })
}
