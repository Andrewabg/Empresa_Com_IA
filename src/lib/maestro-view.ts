
import type { PlanRow, PlanStepRow } from '@/data/plans'
import type { TaskRow } from '@/data/tasks'


export interface PassoView {
  ordinal: number
  role: string
  sub_objective: string
  status: PlanStepRow['status']
  
  agente: string | null
  
  filhoStatus: TaskRow['status'] | null
  depende_de: number[]
}


export interface ResumoPlano {
  total: number
  concluidos: number
  falhos: number
  pulados: number
  emAndamento: number
  pendentes: number
  status: PlanRow['status']
}


export interface ArvorePlano {
  planId: string
  
  rootTaskId: string
  objetivo: string
  status: PlanRow['status']
  replans: number
  passos: PassoView[]
  resumo: ResumoPlano
}


export function derivarArvorePlano(
  plan: PlanRow,
  steps: PlanStepRow[],
  childTasks: TaskRow[],
): ArvorePlano {
  
  const filhoPorId = new Map<string, TaskRow>()
  for (const t of childTasks) filhoPorId.set(t.id, t)

  const passos: PassoView[] = steps.map((s) => ({
    ordinal: s.ordinal,
    role: s.role,
    sub_objective: s.sub_objective,
    status: s.status,
    agente: s.agent_id,
    filhoStatus: s.child_task_id ? (filhoPorId.get(s.child_task_id)?.status ?? null) : null,
    depende_de: s.depends_on,
  }))

  const resumo: ResumoPlano = {
    total: passos.length,
    concluidos: passos.filter((p) => p.status === 'done').length,
    falhos: passos.filter((p) => p.status === 'failed').length,
    pulados: passos.filter((p) => p.status === 'skipped').length,
    emAndamento: passos.filter((p) => p.status === 'delegated').length,
    pendentes: passos.filter((p) => p.status === 'pending').length,
    status: plan.status,
  }

  return {
    planId: plan.id,
    rootTaskId: plan.task_id,
    objetivo: plan.objective,
    status: plan.status,
    replans: plan.replans,
    passos,
    resumo,
  }
}


export function rotuloStatusPasso(status: PlanStepRow['status']): string {
  switch (status) {
    case 'pending':
      return 'Aguardando'
    case 'delegated':
      return 'Em andamento'
    case 'done':
      return 'Concluído'
    case 'failed':
      return 'Falhou'
    case 'skipped':
      return 'Pulado'
  }
}




export interface PassoParseado {
  ordinal: number
  role: string
  sub_objective: string
  depende_de: number[]
  
  contratacao: string | null
}


export interface PlanoParseado {
  passos: PassoParseado[]
  orcamento: string | null
}


export function parsePlanoMarkdown(md: string): PlanoParseado {
  const passos: PassoParseado[] = []
  let orcamento: string | null = null

  for (const raw of md.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    const orc = line.match(/^Orçamento estimado:\s*(.+)$/)
    if (orc) {
      orcamento = orc[1].trim()
      continue
    }

    const m = line.match(/^(\d+)\.\s+\[(.+?)\]\s+(.+)$/)
    if (!m) continue

    const ordinal = Number(m[1])
    const role = m[2].trim()
    let sub = m[3].trim()
    let depende_de: number[] = []
    let contratacao: string | null = null

    
    
    
    const anot = sub.match(/\s*→\s*(reusa .+|CONTRATA NOVO)\s*$/)
    if (anot) {
      contratacao = anot[1].trim()
      sub = sub.slice(0, anot.index).trim()
    }

    const dep = sub.match(/\s*\(depende de:\s*([\d,\s]*)\)\s*$/)
    if (dep) {
      depende_de = dep[1]
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n))
      sub = sub.slice(0, dep.index).trim()
    }

    passos.push({ ordinal, role, sub_objective: sub, depende_de, contratacao })
  }

  return { passos, orcamento }
}
