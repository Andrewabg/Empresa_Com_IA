
import { listChildTasks, updateTask, type TaskRow } from '@/data/tasks'

export interface CancelDeps {
  listChildTasks: typeof listChildTasks
  updateTask: typeof updateTask
}


const TERMINAIS: ReadonlySet<TaskRow['status']> = new Set<TaskRow['status']>([
  'done',
  'failed',
  'cancelled',
])

const defaultDeps: CancelDeps = { listChildTasks, updateTask }


export async function cancelObjective(rootTaskId: string, deps?: Partial<CancelDeps>): Promise<void> {
  const d: CancelDeps = { ...defaultDeps, ...deps }

  await d.updateTask(rootTaskId, { status: 'cancelled', result: 'Objetivo cancelado.' }, 'Objetivo cancelado.')

  const filhos = await d.listChildTasks(rootTaskId)
  for (const c of filhos) {
    if (!TERMINAIS.has(c.status)) {
      await d.updateTask(c.id, { status: 'cancelled' }, 'O objetivo desta tarefa foi cancelado.')
    }
  }
}
