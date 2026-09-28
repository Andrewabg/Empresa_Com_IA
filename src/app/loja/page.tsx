
import { cookies } from 'next/headers'
import { requireMembro } from '@/server/auth/membro'
import { getAgentRow, listAgents } from '@/data/agents'
import { getCargoCatalog } from '@/server/agent/store/cargoCatalog'
import { toCard, agruparPorDepartamento } from '@/lib/marketing-store'
import { readLicenseCache } from '@/server/license/cache'
import { readCatalogFirehose } from '@/server/catalog/cache'
import { getLicenseState } from '@/lib/license-state'
import { LojaClient } from './LojaClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Loja',
  description: 'Contratar especialistas prontos.',
}

export default async function LojaPage() {
  
  
  
  
  const { papel } = await requireMembro(await cookies())
  const isDono = papel === 'dono'

  
  
  
  const seeds = await getCargoCatalog()
  const catalog = seeds.map(toCard)
  const secoes = agruparPorDepartamento(catalog)
  
  
  
  
  const installedChecks = await Promise.all(
    seeds.map(async (s) => {
      const row = await getAgentRow(s.id)
      return row && !row.dismissed_at ? { id: s.id, enabled: row.enabled } : null
    }),
  )
  const contratados = installedChecks.filter((x): x is { id: string; enabled: boolean } => x !== null)
  const installed = contratados.map((c) => c.id)
  const deFerias = contratados.filter((c) => !c.enabled).map((c) => c.id)
  const managers = (await listAgents())
    .filter((a) => a.enabled)
    .map((a) => ({ id: a.id, name: a.name, role: a.role }))
  const licenseState = getLicenseState(await readLicenseCache(), Date.now())
  const firehose = await readCatalogFirehose()

  return (
    <LojaClient
      secoes={secoes}
      installed={installed}
      deFerias={deFerias}
      managers={managers}
      licenseState={licenseState}
      firehoseReason={firehose?.reason ?? null}
      isDono={isDono}
    />
  )
}
