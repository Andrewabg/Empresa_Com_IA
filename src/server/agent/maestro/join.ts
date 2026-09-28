
import { claimTask, updateTask } from '@/data/tasks'
import { getStepByChildTask, updateStep, getSteps } from '@/data/plans'
import { ondaCompleta } from '@/lib/maestro-plan'



export interface ResumeRootDeps {
  claimTask: typeof claimTask
  updateTask: typeof updateTask
  
  runTask: (id: string) => void
}

const defaultResumeRootDeps: ResumeRootDeps = {
  claimTask,
  updateTask,
  runTask: (id) => {
    void import('../executor/runTask').then((m) => m.runTask(id))
  },
}


export async function resumeRoot(rootTaskId: string, deps?: Partial<ResumeRootDeps>): Promise<void> {
  const d: ResumeRootDeps = { ...defaultResumeRootDeps, ...deps }
  
  const claimed = await d.claimTask(rootTaskId, ['needs_children'], 'Os agentes designados terminaram.')
  if (!claimed) return 
  
  await d.updateTask(rootTaskId, { status: 'queued' }, 'Retomando com o que a equipe entregou.')
  d.runTask(rootTaskId)
}



export interface JoinDeps {
  getStepByChildTask: typeof getStepByChildTask
  updateStep: typeof updateStep
  getSteps: typeof getSteps
  
  resumeRoot: (rootTaskId: string) => Promise<void>
}

const defaultJoinDeps: JoinDeps = {
  getStepByChildTask,
  updateStep,
  getSteps,
  resumeRoot: (rootTaskId) => resumeRoot(rootTaskId),
}


export async function onChildTerminal(
  child: { id: string; parent_task_id: string | null; status: string; result: string | null },
  deps?: Partial<JoinDeps>,
): Promise<void> {
  const d: JoinDeps = { ...defaultJoinDeps, ...deps }

  if (!child.parent_task_id) return 

  const step = await d.getStepByChildTask(child.id)
  if (!step) return 

  await d.updateStep(step.id, {
    status: child.status === 'done' ? 'done' : 'failed',
    result: child.result,
  })

  const steps = await d.getSteps(step.plan_id)
  if (ondaCompleta(steps)) await d.resumeRoot(child.parent_task_id)
}
