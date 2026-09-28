
import { cookies } from 'next/headers'
import { requireMembro } from '@/server/auth/membro'
import { listCanais } from '@/data/canais'
import { listConversasInbox } from '@/data/conversasExternas'
import { listAgents } from '@/data/agents'
import { checkToolkitConnections } from '@/server/config/connections'
import { canonicalSlug } from '@/lib/brain-nav'
import { montarFerramentas } from '@/lib/inbox/ferramentas'
import { PAGINA_INBOX } from '@/lib/inbox/filtroConversas'
import InboxClient, { type AtendenteFerramentas } from './InboxClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Inbox',
  description: 'Conversas com clientes nos canais da empresa (WhatsApp).',
}

export default async function InboxPage() {
  
  
  
  
  const membro = await requireMembro(await cookies())

  let canais: Awaited<ReturnType<typeof listCanais>> = []
  let conversas: Awaited<ReturnType<typeof listConversasInbox>>['conversas'] = []
  let temMaisConversas = false
  let agentes: Array<{ id: string; name: string }> = []
  
  let atendentes: AtendenteFerramentas[] = []
  let composioConfigured = false
  let iconePorSlug: Record<string, string | undefined> = {}
  try {
    const [canaisLidos, pagina] = await Promise.all([listCanais(), listConversasInbox({ limite: PAGINA_INBOX })])
    canais = canaisLidos
    conversas = pagina.conversas
    temMaisConversas = pagina.temMais
    
    
    const rows = await listAgents()
    agentes = rows.map((a) => ({ id: a.id, name: a.name }))
    const report = await checkToolkitConnections().catch(() => null)
    composioConfigured = report?.configured ?? false
    iconePorSlug = Object.fromEntries((report?.toolkits ?? []).map((t) => [t.slug, t.icon]))
    
    const ativos = new Set(canais.filter((c) => c.enabled).map((c) => canonicalSlug(c.agent_id)))
    atendentes = rows
      .filter((r) => ativos.has(canonicalSlug(r.id)))
      .map((r) => ({
        agentId: r.id,
        agentName: r.name,
        ferramentas: montarFerramentas(r.tools, report?.toolkits ?? []),
      }))
  } catch (e) {
    console.warn('[inbox] loader fail-open:', e)
    atendentes = [] 
  }

  return (
    <InboxClient
      canais={canais}
      initialConversas={conversas}
      initialTemMais={temMaisConversas}
      agentes={agentes}
      atendentes={atendentes}
      composioConfigured={composioConfigured}
      iconePorSlug={iconePorSlug}
      isDono={membro.papel === 'dono'}
    />
  )
}
