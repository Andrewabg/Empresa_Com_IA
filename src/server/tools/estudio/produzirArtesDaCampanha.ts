








import { getCampanha as getCampanhaImpl, updateCampanhaPlanoItem as updItemImpl } from '@/data/campanhas'
import { pedirArte as pedirArteImpl } from './pedirArte'
import { itensParaArte } from '@/lib/estudio/campanha'
import type { CampanhaRow } from '@/data/campanhas'

const CAP = 8 

export interface ProduzirArtesDeps {
  getCampanha?: (id: string) => Promise<CampanhaRow | null>
  pedirArte?: typeof pedirArteImpl
  updateCampanhaPlanoItem?: typeof updItemImpl
}
export interface ProduzirArtesResult { pedidas: number; summary: string }

export async function produzirArtesDaCampanha(
  input: { campanhaId: string; operatorId: string }, deps: ProduzirArtesDeps = {},
): Promise<ProduzirArtesResult> {
  const getCampanha = deps.getCampanha ?? getCampanhaImpl
  const pedir = deps.pedirArte ?? pedirArteImpl
  const updItem = deps.updateCampanhaPlanoItem ?? updItemImpl

  const camp = await getCampanha(input.campanhaId)
  if (!camp || camp.operator_id !== input.operatorId) {
    return { pedidas: 0, summary: 'Campanha não encontrada.' }
  }

  const indices = itensParaArte(camp.plano)
  if (!indices.length) {
    return { pedidas: 0, summary: 'Nenhuma peça pronta esperando arte (produza as copies primeiro).' }
  }

  let pedidas = 0
  let falhas = 0
  for (const i of indices) {
    if (pedidas >= CAP) break
    const pecaId = camp.plano[i].peca_id!
    
    const r = await pedir({ pecaId, operatorId: input.operatorId, campanhaId: input.campanhaId, planoIndex: i })
    if (!r.ok) {
      falhas++
      
      try { await updItem(input.campanhaId, i, { arte_status: 'falhou' }) } catch {  }
      continue
    }
    pedidas++
    try {
      await updItem(input.campanhaId, i, { arte_task_id: r.taskId, arte_status: 'produzindo' })
    } catch (e) {
      
      
      console.warn('[produzirArtesDaCampanha] marcação do item falhou (não-fatal):', e)
    }
  }

  const parteFalha = falhas ? ` ${falhas} não deu (dá pra tentar de novo).` : ''
  return {
    pedidas,
    summary: pedidas
      ? `Pedi a arte de ${pedidas} peça(s) pro Téo. Elas nascem no estúdio dele.${parteFalha}`
      : `Não consegui abrir os pedidos de arte agora.${parteFalha}`,
  }
}
