
import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { listAgents } from '@/data/agents'
import { listLiveTasks, listChildTasks, type TaskRow } from '@/data/tasks'
import { getPlan, getSteps } from '@/data/plans'
import { derivarArvorePlano, type ArvorePlano } from '@/lib/maestro-view'
import { ensureCooSeeded } from '@/server/agent/ensureCooSeeded'
import { projectOrgTree } from '@/lib/organograma/orgView'
import { getBranding } from '@/server/config/branding'
import { buildOrgTree } from './tree'
import { OrganogramaClient } from './OrganogramaClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Organograma',
  description: 'Sua empresa, viva — quem responde a quem.',
}


async function loadPlanViews(tasks: TaskRow[]): Promise<Record<string, ArvorePlano[]>> {
  const roots = tasks.filter((t) => t.plan_id && !t.parent_task_id)
  const out: Record<string, ArvorePlano[]> = {}
  await Promise.all(
    roots.map(async (root) => {
      try {
        const [plan, steps, children] = await Promise.all([
          getPlan(root.plan_id as string),
          getSteps(root.plan_id as string),
          listChildTasks(root.id),
        ])
        if (!plan) return
        const arvore = derivarArvorePlano(plan, steps, children)
        ;(out[root.agent_id] ??= []).push(arvore)
      } catch (err) {
        console.warn('[organograma] falha ao carregar plano vivo (não-fatal):', err)
      }
    }),
  )
  return out
}

export default async function OrganogramaPage() {
  await requireOperator(await cookies())
  await ensureCooSeeded() 
  const [agents, tasks, branding] = await Promise.all([listAgents(), listLiveTasks(), getBranding()])
  const tree = buildOrgTree(agents, tasks)
  const plansByAgent = await loadPlanViews(tasks)

  
  
  const treeUI = projectOrgTree(tree)
  
  const planos = Object.values(plansByAgent).flat()
  const orquestrando = Object.keys(plansByAgent)
  const nomesPorId = Object.fromEntries(agents.map((a) => [a.id, a.name]))

  return (
    <OrganogramaClient
      tree={treeUI}
      planos={planos}
      orquestrando={orquestrando}
      nomesPorId={nomesPorId}
      assistantName={branding.assistantName}
    />
  )
}
