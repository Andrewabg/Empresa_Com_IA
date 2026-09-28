import { serverDb } from '../server/supabase'


export interface PlanRow {
  id: string
  task_id: string
  objective: string
  status: 'pending_approval' | 'approved' | 'rejected' | 'executing' | 'done' | 'failed'
  replans: number
  created_at: string
  updated_at: string
}


export interface PlanStepRow {
  id: string
  plan_id: string
  ordinal: number
  role: string
  sub_objective: string
  depends_on: number[]
  status: 'pending' | 'delegated' | 'done' | 'failed' | 'skipped'
  agent_id: string | null
  child_task_id: string | null
  result: string | null
}


export interface NewStep {
  ordinal: number
  role: string
  sub_objective: string
  depends_on: number[]
}


const PLANO_DESCARTADO: ReadonlySet<PlanRow['status']> = new Set(['rejected', 'failed'])


export async function createPlan(
  taskId: string,
  objective: string,
  steps: NewStep[],
): Promise<{ plan: PlanRow; steps: PlanStepRow[] }> {
  const db = serverDb()

  let replans = 0
  const anterior = await getPlanByTask(taskId)
  if (anterior) {
    if (!PLANO_DESCARTADO.has(anterior.status)) {
      throw new Error(
        `createPlan: a tarefa ${taskId} já tem um plano ${anterior.status} (${anterior.id}); ` +
        'só um plano recusado ou falho pode ser substituído.',
      )
    }
    const { error: delErr } = await db.from('plans').delete().eq('id', anterior.id)
    if (delErr) throw new Error(`createPlan descartar anterior: ${delErr.message}`)
    replans = anterior.replans + 1
  }

  const { data: planData, error: planErr } = await db
    .from('plans')
    .insert({ task_id: taskId, objective, replans })
    .select()
    .single()
  if (planErr) throw new Error(`createPlan plan: ${planErr.message}`)
  const plan = planData as PlanRow

  const { data: stepsData, error: stepsErr } = await db
    .from('plan_steps')
    .insert(
      steps.map((s) => ({
        plan_id: plan.id,
        ordinal: s.ordinal,
        role: s.role,
        sub_objective: s.sub_objective,
        depends_on: s.depends_on,
      })),
    )
    .select()
    .order('ordinal', { ascending: true })
  if (stepsErr) throw new Error(`createPlan steps: ${stepsErr.message}`)
  return { plan, steps: (stepsData ?? []) as PlanStepRow[] }
}

export async function getPlanByTask(taskId: string): Promise<PlanRow | null> {
  const { data, error } = await serverDb().from('plans').select().eq('task_id', taskId).maybeSingle()
  if (error) throw new Error(`getPlanByTask: ${error.message}`)
  return (data as PlanRow | null) ?? null
}

export async function getPlan(id: string): Promise<PlanRow | null> {
  const { data, error } = await serverDb().from('plans').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getPlan: ${error.message}`)
  return (data as PlanRow | null) ?? null
}

export async function setPlanStatus(id: string, status: PlanRow['status']): Promise<void> {
  const { error } = await serverDb()
    .from('plans')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`setPlanStatus: ${error.message}`)
}


export async function incReplans(id: string): Promise<number> {
  const current = await getPlan(id)
  if (!current) throw new Error(`incReplans: plano ${id} não existe`)
  const next = current.replans + 1
  const { data, error } = await serverDb()
    .from('plans')
    .update({ replans: next, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('replans')
    .single()
  if (error) throw new Error(`incReplans: ${error.message}`)
  return (data as { replans: number }).replans
}

export async function getSteps(planId: string): Promise<PlanStepRow[]> {
  const { data, error } = await serverDb()
    .from('plan_steps')
    .select()
    .eq('plan_id', planId)
    .order('ordinal', { ascending: true })
  if (error) throw new Error(`getSteps: ${error.message}`)
  return (data ?? []) as PlanStepRow[]
}

export async function updateStep(
  id: string,
  patch: Partial<Pick<PlanStepRow, 'status' | 'agent_id' | 'child_task_id' | 'result' | 'sub_objective'>>,
): Promise<void> {
  const { error } = await serverDb()
    .from('plan_steps')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`updateStep: ${error.message}`)
}

export async function getStepByChildTask(childTaskId: string): Promise<PlanStepRow | null> {
  const { data, error } = await serverDb()
    .from('plan_steps')
    .select()
    .eq('child_task_id', childTaskId)
    .maybeSingle()
  if (error) throw new Error(`getStepByChildTask: ${error.message}`)
  return (data as PlanStepRow | null) ?? null
}
