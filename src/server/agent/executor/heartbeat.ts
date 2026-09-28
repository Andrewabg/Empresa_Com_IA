
import { listClaimableQueued, listColdRunning, listParkedRoots, updateTask, type TaskRow } from '@/data/tasks'
import { getPlanByTask, getSteps, type PlanRow, type PlanStepRow } from '@/data/plans'
import { ondaCompleta } from '@/lib/maestro-plan'
import { createLimiter } from '@/lib/concurrency'
import { resumeRoot } from '../maestro/join'
import { runTask } from './runTask'

const DEFAULT_COLD_MS = 10 * 60_000 

export const DEFAULT_POOL = 5

export interface HeartbeatDeps {
  run?: (id: string) => void
  now?: () => number
  coldMs?: number
  pool?: number
  
  listParkedRoots?: () => Promise<TaskRow[]>
  getPlanByTask?: (taskId: string) => Promise<PlanRow | null>
  getSteps?: (planId: string) => Promise<PlanStepRow[]>
  resumeRoot?: (rootTaskId: string) => Promise<void>
}


export async function sweepParkedRoots(deps: HeartbeatDeps = {}): Promise<number> {
  const fetchParked = deps.listParkedRoots ?? listParkedRoots
  const planByTask = deps.getPlanByTask ?? getPlanByTask
  const stepsOf = deps.getSteps ?? getSteps
  const revive = deps.resumeRoot ?? ((id: string) => resumeRoot(id))

  const parked = await fetchParked()
  let revived = 0
  for (const r of parked) {
    try {
      if (!r.plan_id) continue 
      const plan = await planByTask(r.id)
      if (!plan) continue
      const steps = await stepsOf(plan.id)
      if (ondaCompleta(steps)) {
        await revive(r.id)
        revived++
      }
    } catch (err) {
      console.warn('[heartbeat] sweep de raiz presa falhou (não-fatal):', r.id, err)
    }
  }
  return revived
}

export async function runHeartbeat(deps: HeartbeatDeps = {}): Promise<{ started: number; reenqueued: number; revived: number }> {
  const now = deps.now ?? (() => Date.now())
  const coldMs = deps.coldMs ?? DEFAULT_COLD_MS
  const pool = deps.pool ?? DEFAULT_POOL
  const limiter = createLimiter(pool)
  const fire = deps.run ?? ((id: string) => { void limiter.run(() => runTask(id)).catch((e) => console.warn('[heartbeat] fire falhou (não-fatal):', e)) })

  
  const queued = await listClaimableQueued()
  for (const t of queued) fire(t.id)

  
  const cutoff = new Date(now() - coldMs).toISOString()
  const cold = await listColdRunning(cutoff)
  for (const t of cold) {
    await updateTask(t.id, { status: 'queued' }, 'A execução parou no meio e foi reenfileirada.')
    fire(t.id)
  }

  
  const revived = await sweepParkedRoots(deps)

  return { started: queued.length, reenqueued: cold.length, revived }
}
