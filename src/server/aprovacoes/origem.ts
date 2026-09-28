




import type { Approval } from '@/data/approvals'
import type { OrigemLabels } from '@/lib/aprovacoes/origem'
import { getContato as getContatoReal } from '@/data/contatos'
import { getCanal as getCanalReal } from '@/data/canais'
import { canonicalSlug } from '@/lib/brain-nav'
import { carregarNomesDeAgente } from './nomesDeAgente'

export interface ResolverOrigensDeps {
  getContato?: (id: string) => Promise<{ nome: string } | null>
  getCanal?: (id: string) => Promise<{ rotulo: string } | null>
  listAgentsSummary?: () => Promise<{ id: string; name: string }[]>
}

function temOrigem(a: Approval): boolean {
  return Boolean(a.conversa_id || a.contato_id || a.canal_id)
}

export async function resolverOrigens(
  approvals: Approval[],
  deps: ResolverOrigensDeps = {},
): Promise<Record<string, OrigemLabels>> {
  const relevantes = approvals.filter(temOrigem)
  if (!relevantes.length) return {}

  const getContato = deps.getContato ?? getContatoReal
  const getCanal = deps.getCanal ?? getCanalReal
  const listSummary = deps.listAgentsSummary

  const contatoIds = [...new Set(relevantes.map((a) => a.contato_id).filter((x): x is string => !!x))]
  const canalIds = [...new Set(relevantes.map((a) => a.canal_id).filter((x): x is string => !!x))]

  const contatoNome = new Map<string, string>()
  const canalRotulo = new Map<string, string>()
  const agentePorSlug = new Map<string, string>()

  await Promise.all([
    
    Promise.all(
      contatoIds.map(async (id) => {
        try {
          const row = await getContato(id)
          if (row?.nome) contatoNome.set(id, row.nome)
        } catch {  }
      }),
    ),
    Promise.all(
      canalIds.map(async (id) => {
        try {
          const row = await getCanal(id)
          if (row?.rotulo) canalRotulo.set(id, row.rotulo)
        } catch {  }
      }),
    ),
    
    (async () => {
      const nomes = await carregarNomesDeAgente(listSummary ? { listAgentsSummary: listSummary } : {})
      for (const [slug, nome] of Object.entries(nomes)) agentePorSlug.set(slug, nome)
    })(),
  ])

  const out: Record<string, OrigemLabels> = {}
  for (const a of relevantes) {
    out[a.id] = {
      agente: a.agent ? agentePorSlug.get(canonicalSlug(a.agent)) ?? null : null,
      contato: a.contato_id ? contatoNome.get(a.contato_id) ?? null : null,
      canal: a.canal_id ? canalRotulo.get(a.canal_id) ?? null : null,
    }
  }
  return out
}
