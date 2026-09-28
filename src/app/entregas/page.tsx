
import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { getDefaultBrand } from '@/data/brands'
import { listCampanhas, toCampanhaView } from '@/data/campanhas'
import { listArtesDasEntregas } from '@/data/pecas'
import { getAgentRow } from '@/data/agents'
import { montarEntrega } from '@/lib/entrega/progresso'
import { indexarArtesPorSlot } from '@/lib/entrega/artes'
import { EntregasClient } from './EntregasClient'
import type { Entrega } from '@/lib/entrega/types'
import type { CampanhaView } from '@/lib/estudio/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Entregas',
  description: 'Peça uma vez e acompanhe o pacote inteiro.',
}

export default async function EntregasPage() {
  const operator = await requireOperator(await cookies())

  const [brand, copywriter, designer] = await Promise.all([
    getDefaultBrand(operator.id).catch((e: unknown) => {
      console.warn('[/entregas] marca falhou (fail-open):', e)
      return null
    }),
    getAgentRow('copywriter').catch(() => null),
    getAgentRow('designer').catch(() => null),
  ])

  let campanhas: CampanhaView[] = []
  let entregas: Entrega[] = []
  if (brand) {
    try {
      const rows = await listCampanhas(operator.id, brand.id)
      campanhas = rows.map(toCampanhaView)
      let artesPorCampanha: Record<string, Awaited<ReturnType<typeof listArtesDasEntregas>>[string]> = {}
      try {
        artesPorCampanha = await listArtesDasEntregas(operator.id, campanhas.map((c) => c.id))
      } catch (e) {
        
        console.warn('[/entregas] leitura das artes falhou (fail-open):', e)
      }
      entregas = campanhas.map((c) =>
        montarEntrega(c, indexarArtesPorSlot(artesPorCampanha[c.id] ?? [])),
      )
    } catch (e) {
      console.warn('[/entregas] leitura das entregas falhou (fail-open):', e)
    }
  }

  return (
    <EntregasClient
      initialCampanhas={campanhas}
      initialEntregas={entregas}
      temMarca={!!brand}
      copywriterInstalado={!!copywriter && copywriter.enabled}
      designerInstalado={!!designer && designer.enabled}
      nomeCopywriter={copywriter?.name ?? 'Lia'}
      nomeDesigner={designer?.name ?? 'Téo'}
    />
  )
}
