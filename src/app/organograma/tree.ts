import type { AgentRow } from '@/data/agents'
import type { TaskRow } from '@/data/tasks'

export interface OrgNode {
  agent: AgentRow
  children: OrgNode[]
  live: { running: number; needs_approval: number; queued: number }
}

export function buildOrgTree(agents: AgentRow[], tasks: TaskRow[]): OrgNode[] {
  const counts = new Map<string, OrgNode['live']>()
  for (const a of agents) counts.set(a.id, { running: 0, needs_approval: 0, queued: 0 })
  for (const t of tasks) {
    const c = counts.get(t.agent_id)
    if (!c) continue
    if (t.status === 'running') c.running++
    else if (t.status === 'needs_approval') c.needs_approval++
    else if (t.status === 'queued') c.queued++
  }

  const byId = new Map(agents.map((a) => [a.id, a]))
  const nodes = new Map<string, OrgNode>(
    agents.map((a) => [a.id, { agent: a, children: [], live: counts.get(a.id)! }]),
  )
  const roots: OrgNode[] = []
  for (const a of agents) {
    const node = nodes.get(a.id)!
    
    if (a.manager_id && byId.has(a.manager_id)) {
      nodes.get(a.manager_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  
  roots.sort((x, y) => Number(y.agent.is_primary) - Number(x.agent.is_primary))
  return roots
}
