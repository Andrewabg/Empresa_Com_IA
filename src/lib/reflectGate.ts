
export interface ReflectGateTask { agent_id: string; status: string; plan_id: string | null }

export function shouldReflectTask(t: ReflectGateTask, primaryId: string): boolean {
  return t.status === 'done' && !t.plan_id && !!t.agent_id && t.agent_id !== primaryId
}
