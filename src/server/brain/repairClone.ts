










import { rmSync } from 'node:fs'
import { cloneDir } from './skillsPaths'
import { invalidateBrainCache } from './runtime'



const CORRUPTION_RE =
  /error building trees|invalid object|invalid sha1 pointer|broken link from|bad object|could not (?:get|read)[\s\S]*object|object file[\s\S]*is empty|loose object[\s\S]*is corrupt|unable to read (?:tree|object)|missing (?:blob|tree|object)|not a valid object name/i


const REBASE_TRAVADO_RE =
  /you are not currently on a branch|there is already a rebase-merge directory|rebase(-merge)? in progress|cannot pull with rebase/i


export function isBrainCorruption(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return CORRUPTION_RE.test(msg) || REBASE_TRAVADO_RE.test(msg)
}


export function repairBrainClone(): void {
  try {
    rmSync(cloneDir(), { recursive: true, force: true })
  } catch {
    
  }
  invalidateBrainCache()
}


export async function withCloneRepair<T>(
  fn: () => Promise<T>,
  deps: { detect?: (e: unknown) => boolean; repair?: () => void } = {},
): Promise<T> {
  const detect = deps.detect ?? isBrainCorruption
  const repair = deps.repair ?? repairBrainClone
  try {
    return await fn()
  } catch (err) {
    if (!detect(err)) throw err
    repair()
    return await fn() 
  }
}
