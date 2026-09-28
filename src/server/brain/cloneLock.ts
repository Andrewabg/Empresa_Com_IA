
import { withTimeout } from '@/lib/withTimeout'


const CLONE_LOCK_TIMEOUT_MS = Number(process.env.BRAIN_CLONE_LOCK_TIMEOUT_MS) || 60_000


let _chain: Promise<unknown> = Promise.resolve()


export function withCloneLock<T>(fn: () => Promise<T>, timeoutMs = CLONE_LOCK_TIMEOUT_MS): Promise<T> {
  
  
  let trabalho: Promise<unknown> | undefined
  const run = _chain.then(() => {
    const p = fn()
    trabalho = p
    return withTimeout(p, timeoutMs, 'cloneLock')
  })
  
  
  _chain = run.then(() => trabalho, () => trabalho).catch(() => {})
  return run
}


export async function _drainCloneLock(): Promise<void> {
  await _chain.catch(() => {})
}
