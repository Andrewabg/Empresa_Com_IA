



import type { MockApproval } from '@/mock/types'
import type { PrazoView } from '@/lib/juridico/prazosTipos'
import { classificarPrazo, ordenarRadar, type Urgencia } from '@/lib/juridico/prazosRadar'

export type ApprovalItem = Pick<MockApproval, 'id' | 'kind' | 'title' | 'agent'>

export interface AtendimentoResumo {
  aguardando: number
  rascunhos: number
}


export interface TarefaFalhaItem {
  id: string
  objetivo: string
  agente: string
}

export type DecisionItem =
  | { kind: 'approval'; approval: ApprovalItem }
  | { kind: 'tarefa'; id: string; objetivo: string; agente: string }
  | { kind: 'atendimento'; label: string; href: '/inbox' }
  | { kind: 'prazo'; id: string; titulo: string; linha: string; urgencia: Urgencia; href: '/juridico' }


export function textoPrazo(dias: number): string {
  if (dias < 0) {
    const n = Math.abs(dias)
    return `venceu há ${n} ${n === 1 ? 'dia' : 'dias'}`
  }
  if (dias === 0) return 'vence hoje'
  return `vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}


export function labelAtendimento({ aguardando, rascunhos }: AtendimentoResumo): string {
  const parts: string[] = []
  if (aguardando > 0) {
    parts.push(`${aguardando} ${aguardando === 1 ? 'conversa aguardando' : 'conversas aguardando'} você`)
  }
  if (rascunhos > 0) {
    parts.push(`${rascunhos} ${rascunhos === 1 ? 'rascunho a aprovar' : 'rascunhos a aprovar'}`)
  }
  return parts.join(' · ')
}

export interface DecisionQueueInput {
  approvals: ApprovalItem[]
  
  falhas?: TarefaFalhaItem[]
  atendimento: AtendimentoResumo | null
  
  prazos: PrazoView[]
  
  hoje: string
}

export function buildDecisionQueue(input: DecisionQueueInput): DecisionItem[] {
  const items: DecisionItem[] = input.approvals.map((a) => ({
    kind: 'approval' as const,
    approval: a,
  }))
  
  
  for (const f of input.falhas ?? []) {
    items.push({ kind: 'tarefa', id: f.id, objetivo: f.objetivo, agente: f.agente })
  }
  const at = input.atendimento
  if (at && (at.aguardando > 0 || at.rascunhos > 0)) {
    items.push({ kind: 'atendimento', label: labelAtendimento(at), href: '/inbox' })
  }
  for (const p of ordenarRadar(input.prazos, input.hoje)) {
    const { diasRestantes, urgencia } = classificarPrazo(p, input.hoje)
    items.push({
      kind: 'prazo',
      id: p.id,
      titulo: p.titulo,
      linha: textoPrazo(diasRestantes),
      urgencia,
      href: '/juridico',
    })
  }
  return items
}


export function decisionQueueCount(input: DecisionQueueInput): number {
  return buildDecisionQueue(input).length
}
