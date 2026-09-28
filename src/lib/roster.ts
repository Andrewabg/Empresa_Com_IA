


export interface RosterAgent {
  id: string
  name: string
  role: string
  manager_id: string | null
  enabled: boolean
  is_primary: boolean
}

const ROSTER_RULE =
  'NÃO invente funcionários: você conhece exatamente o time acima. Se perguntarem de ' +
  'alguém fora da lista, diga que essa pessoa não está contratada e ofereça contratar — ' +
  'nunca invente o cargo ou o que ela faz. Para detalhes de um funcionário (missão, ' +
  'skills, tarefas recentes), use a tool detalharFuncionario com o id dele.'


export function renderRoster(agents: RosterAgent[], selfId?: string): string {
  const enabled = agents.filter((a) => a.enabled)
  if (enabled.length === 0) return ''
  const self = selfId ?? enabled.find((a) => a.is_primary)?.id
  const byId = new Map(enabled.map((a) => [a.id, a]))
  const sorted = [...enabled].sort((a, b) => {
    const aSelf = a.id === self
    const bSelf = b.id === self
    if (aSelf !== bSelf) return aSelf ? -1 : 1
    const n = a.name.localeCompare(b.name, 'pt-BR')
    return n !== 0 ? n : a.id.localeCompare(b.id)
  })
  const lines = sorted.map((a) => {
    const selfTag = a.id === self ? ' (você)' : ''
    const mgr = a.manager_id ? byId.get(a.manager_id)?.name : undefined
    const mgrTag = a.id !== self && mgr ? ` · reporta a ${mgr}` : ''
    return `- ${a.name}${selfTag} — ${a.role} · id: ${a.id}${mgrTag}`
  })
  return `EQUIPE ATUAL (organograma vivo):\n${lines.join('\n')}\n\n${ROSTER_RULE}`
}

export interface AgentDetail {
  id: string
  name: string
  role: string
  managerName: string | null
  skills: string[]
  systemPrompt: string
  recentTasks: { objective: string; status: string }[]
}


export function formatAgentDetail(d: AgentDetail): string {
  const lines: string[] = [
    `${d.name} — ${d.role} (id: ${d.id})`,
    d.managerName ? `Reporta a: ${d.managerName}` : 'Sem gerente (topo do organograma).',
    d.skills.length ? `Skills: ${d.skills.join(', ')}` : 'Sem skills equipadas.',
    '',
    'Persona/missão:',
    d.systemPrompt.trim(),
  ]
  if (d.recentTasks.length) {
    lines.push('', 'Tarefas recentes:')
    for (const t of d.recentTasks) lines.push(`- [${t.status}] ${t.objective}`)
  }
  return lines.join('\n')
}
