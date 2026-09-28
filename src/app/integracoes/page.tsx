
import { cookies } from 'next/headers'
import { requireDono } from '@/server/auth/membro'
import { listarMarketplace } from '@/server/integracoes/marketplace'
import { projetarIntegracaoCard } from '@/lib/integracoes/projecao'
import { estadoConexaoGoogleAds, formatarCustomerId } from '@/server/google-ads/conexao'
import { readLicenseCache } from '@/server/license/cache'
import { getLicenseState, lojaLiberada } from '@/lib/license-state'
import { listAgentsSummary } from '@/data/agents'
import { algumAgenteHabilitadoTem } from '@/lib/cockpit'
import { IntegracoesClient } from './IntegracoesClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Integrações',
  description: 'Descubra, busque e conecte tudo que seus funcionários podem plugar.',
}


async function derivarGoogleAds() {
  const agents = await listAgentsSummary().catch(() => null)
  if (!agents || !algumAgenteHabilitadoTem(agents, ['painelGoogle', 'proporAcaoGoogle'])) return null

  const estado = await estadoConexaoGoogleAds().catch(() => ({
    conectado: false,
    customerId: null as string | null,
    fonte: null as 'local' | 'hub' | null,
  }))
  let premium = false
  try {
    premium = lojaLiberada(getLicenseState(await readLicenseCache(), Date.now()))
  } catch {
    premium = false
  }
  return {
    conectado: estado.conectado,
    customerId: estado.customerId,
    customerIdLabel: estado.customerId ? formatarCustomerId(estado.customerId) : null,
    fonte: estado.fonte,
    premium,
  }
}

export default async function IntegracoesPage() {
  await requireDono(await cookies()) 
  const [marketplace, googleAds] = await Promise.all([
    listarMarketplace().catch(() => ({ configured: false, cards: [] as const })),
    derivarGoogleAds(),
  ])
  const items = marketplace.cards.map(projetarIntegracaoCard)
  return <IntegracoesClient items={items} configured={marketplace.configured} googleAds={googleAds} />
}
