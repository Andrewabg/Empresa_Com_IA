
import type { AgentSpec } from '../agent/architect'
import type { HiringBrief } from '@/lib/hiring/brief'
import type { CandidatoCardData, CandidatoAntes } from '../agent/wireTypes'
import { missaoCurta } from '@/lib/workspace/missao'
import { listarAcoesConectadas } from '../actions/actions'
import { classifyAction } from '../actions/classify'


const CAP_AMOSTRA = 5

export interface CandidatoDeps {
  
  listActions?: () => Promise<{ slug: string; tags?: string[] }[]>
}


export function humanizarAcao(actionSlug: string, toolkitSlug: string): string {
  const upper = actionSlug.toUpperCase()
  const prefixo = `${toolkitSlug.toUpperCase()}_`
  const semPrefixo = upper.startsWith(prefixo) ? upper.slice(prefixo.length) : upper
  return semPrefixo.toLowerCase().split('_').filter(Boolean).join(' ')
}

export function capAmostra(itens: string[]): string[] {
  if (itens.length <= CAP_AMOSTRA) return itens
  return [...itens.slice(0, CAP_AMOSTRA), `+${itens.length - CAP_AMOSTRA} ações`]
}


export function fraseLeituraCerebro(scopes: string[]): string {
  if (!scopes.length) return 'Lê o que precisar do Cérebro da empresa'
  return `Lê só: ${scopes.join(', ')}`
}


export async function montarCandidato(
  spec: AgentSpec,
  brief: HiringBrief,
  deps: CandidatoDeps = {},
  antes?: CandidatoAntes,
): Promise<CandidatoCardData> {
  const listActions =
    deps.listActions ??
    (async () =>
      (await listarAcoesConectadas()) as { slug: string; tags?: string[] }[])

  
  
  const ferramentas = brief.ferramentas
    .filter((f) => f.status === 'conectada' || f.status === 'pendente' || f.status === 'indisponivel')
    .map((f) => ({ slug: f.slug, name: f.name, status: f.status as string }))

  const conectadas = brief.ferramentas.filter((f) => f.status === 'conectada')

  let fazSozinho: string[] = []
  let pedeAprovacao: string[] = []
  if (conectadas.length) {
    try {
      const actions = await listActions()
      const reads: string[] = []
      const writes: string[] = []
      for (const a of actions) {
        const slug = String(a?.slug ?? '')
        if (!slug) continue
        const dona = conectadas.find((f) => slug.toUpperCase().startsWith(`${f.slug.toUpperCase()}_`))
        if (!dona) continue
        const legivel = humanizarAcao(slug, dona.slug)
        if (classifyAction(slug, a.tags) === 'read') reads.push(legivel)
        else writes.push(legivel)
      }
      fazSozinho = capAmostra(reads)
      pedeAprovacao = capAmostra(writes)
    } catch {
      
    }
  }
  if (!fazSozinho.length) fazSozinho = ['consultas nas ferramentas conectadas']
  if (!pedeAprovacao.length) pedeAprovacao = ['toda ação que altera algo pede sua aprovação']

  return {
    nome: spec.name,
    papel: spec.role,
    missao: missaoCurta(spec.system_prompt, spec.role),
    fazSozinho,
    pedeAprovacao,
    ferramentas,
    leituraCerebro: fraseLeituraCerebro(spec.brain_read_scopes),
    budgetUsd: spec.budget.per_task_usd,
    ...(antes ? { antes } : {}),
  }
}
