
import { listCampanhasComArtePendente as listImpl, type CampanhaRow } from '@/data/campanhas'
import { produzirArtesDaCampanha as produzirImpl } from '../tools/estudio/produzirArtesDaCampanha'
import { entregaPedeArte, itensParaArteDaEntrega } from '@/lib/entrega/progresso'


export const ENTREGAS_POR_PASSADA = 3

export interface EntregasHeartbeatDeps {
  listCampanhas?: () => Promise<CampanhaRow[]>
  produzirArtes?: typeof produzirImpl
}

export interface EntregasHeartbeatResult {
  
  conduzidas: number
  
  artesPedidas: number
}

export async function runEntregasHeartbeat(
  deps: EntregasHeartbeatDeps = {},
): Promise<EntregasHeartbeatResult> {
  const listar = deps.listCampanhas ?? listImpl
  const produzir = deps.produzirArtes ?? produzirImpl

  let campanhas: CampanhaRow[] = []
  try {
    campanhas = await listar()
  } catch (e) {
    console.warn('[entregas] leitura das entregas falhou (fail-open):', e)
    return { conduzidas: 0, artesPedidas: 0 }
  }

  let conduzidas = 0
  let artesPedidas = 0
  for (const c of campanhas) {
    if (conduzidas >= ENTREGAS_POR_PASSADA) break
    
    if (!entregaPedeArte(c.brief)) continue
    if (!itensParaArteDaEntrega(c.plano ?? [], true).length) continue
    try {
      const r = await produzir({ campanhaId: c.id, operatorId: c.operator_id })
      conduzidas++
      artesPedidas += r.pedidas
    } catch (e) {
      console.warn('[entregas] condução falhou (não-fatal):', c.id, e)
    }
  }
  return { conduzidas, artesPedidas }
}
