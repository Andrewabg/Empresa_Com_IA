
import { AGENTES_INTERNOS } from '@/lib/agentes/fichaHumana'


export interface LiveCounts {
  running: number
  needs_approval: number
  queued: number
}


export interface OrgNodeInput {
  agent: {
    id: string
    name: string
    role: string
    enabled: boolean
    is_primary: boolean
  }
  live: LiveCounts
  children: OrgNodeInput[]
}


export interface OrgNodeUI {
  id: string
  name: string
  role: string
  enabled: boolean
  is_primary: boolean
  live: LiveCounts
  children: OrgNodeUI[]
}


export function projectOrgTree(nodes: OrgNodeInput[]): OrgNodeUI[] {
  const promovidos: OrgNodeUI[] = []
  const raizes = filtraNivel(nodes, promovidos)
  const out = [...raizes, ...promovidos]
  out.sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
  return out
}

function filtraNivel(nodes: OrgNodeInput[], promovidos: OrgNodeUI[]): OrgNodeUI[] {
  const out: OrgNodeUI[] = []
  for (const n of nodes) {
    if (AGENTES_INTERNOS.includes(n.agent.id)) {
      
      promovidos.push(...filtraNivel(n.children, promovidos))
      continue
    }
    out.push({
      id: n.agent.id,
      name: n.agent.name,
      role: n.agent.role,
      enabled: n.agent.enabled,
      is_primary: n.agent.is_primary,
      live: n.live,
      children: filtraNivel(n.children, promovidos),
    })
  }
  return out
}


export function resumoOrg(nodes: OrgNodeUI[]): { pessoas: number; trabalhando: number } {
  let pessoas = 0
  let trabalhando = 0
  const anda = (ns: OrgNodeUI[]) => {
    for (const n of ns) {
      pessoas++
      if (n.live.running > 0) trabalhando++
      anda(n.children)
    }
  }
  anda(nodes)
  return { pessoas, trabalhando }
}

export type ChipVivo = 'running' | 'needs_approval' | 'queued'


export function rotuloChipVivo(kind: ChipVivo, n: number): string {
  switch (kind) {
    case 'running':
      return n === 1 ? '1 tarefa em andamento' : `${n} tarefas em andamento`
    case 'needs_approval':
      return `${n} esperando você`
    case 'queued':
      return `${n} na fila`
    default:
      return kind satisfies never
  }
}
