
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { requireOperator } from '@/server/auth/session'
import { criacaoSobMedidaLiberada } from '@/server/hiring/gate'
import { getSessionEmAndamento } from '@/data/hiringSessions'
import { getAgentRow } from '@/data/agents'
import type { ToolkitCardData, CandidatoCardData } from '@/server/agent/wireTypes'
import { RETOMADA_MAX_MS } from '@/lib/hiring/retomada'
import { ContratarClient, type SessaoInicial } from './ContratarClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Contratar sob medida',
  description: 'Crie um agente sob medida conversando com o RH.',
}

export default async function ContratarPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>
}) {
  await requireOperator(await cookies())

  
  const { agent } = await searchParams
  const revisaoId = typeof agent === 'string' && agent.length > 0 ? agent : null

  
  
  
  if (!revisaoId && !(await criacaoSobMedidaLiberada())) redirect('/loja')

  let revisao: { agentId: string; nome: string; papel: string } | null = null
  if (revisaoId) {
    const row = await getAgentRow(revisaoId).catch(() => null)
    if (!row) notFound()
    
    if (row.is_primary) redirect('/conversa')
    revisao = { agentId: revisaoId, nome: row.name, papel: row.role }
  }

  const s = await getSessionEmAndamento().catch(() => null)
  const retomavel = s !== null && Date.now() - Date.parse(s.updated_at) < RETOMADA_MAX_MS
  
  
  const sessaoDoContexto = !revisaoId
    ? s
    : s && s.mode === 'revisao' && s.agent_id === revisaoId
      ? s
      : null

  let sessao: SessaoInicial | null = null
  if (sessaoDoContexto && retomavel) {
    sessao = {
      id: sessaoDoContexto.id,
      transcript: sessaoDoContexto.transcript.map((m) => ({
        role: m.role,
        content: m.content,
        at: m.at,
      })),
      
      
      toolkits: sessaoDoContexto.brief.ferramentas.map(
        (f): ToolkitCardData => ({ slug: f.slug, name: f.name, status: f.status, validado: true }),
      ),
      candidato: (sessaoDoContexto.candidato as CandidatoCardData | null) ?? null,
    }
  }

  
  const sessaoVelha = !revisaoId && s !== null && !retomavel

  return <ContratarClient sessao={sessao} sessaoVelha={sessaoVelha} revisao={revisao} />
}
