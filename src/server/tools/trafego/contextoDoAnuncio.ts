












import { getUltimoSnapshotDaEntidade as getUltimoImpl } from '@/data/trafego'
import { diagnosticarCriativo } from '@/lib/trafego/criativo'
import type { CausaCriativo } from '@/lib/trafego/criativo'
import type { MetricShape } from '@/lib/trafego/types'
import type { SnapshotRow } from '@/data/trafego'

export interface ContextoDoAnuncio {
  nome?: string
  causa?: CausaCriativo
}

export interface ContextoDoAnuncioDeps {
  getUltimoSnapshot?: (operatorId: string, level: SnapshotRow['level'], entityId: string) => Promise<SnapshotRow | null>
}


const CAUSAS_DE_CRIATIVO = new Set<CausaCriativo>(['hook', 'hold', 'ctr_cta'])

export async function contextoDoAnuncio(
  input: { operatorId: string; adId: string },
  deps: ContextoDoAnuncioDeps = {},
): Promise<ContextoDoAnuncio> {
  const getUltimoSnapshot = deps.getUltimoSnapshot ?? getUltimoImpl
  try {
    const snap = await getUltimoSnapshot(input.operatorId, 'ad', input.adId)
    if (!snap) return {}
    const nome = (snap.entity_name ?? '').trim() || undefined
    const diag = diagnosticarCriativo({ id: input.adId, nome: snap.entity_name, m: (snap.metrics ?? {}) as MetricShape })
    return {
      ...(nome ? { nome } : {}),
      ...(CAUSAS_DE_CRIATIVO.has(diag.causa) ? { causa: diag.causa } : {}),
    }
  } catch (e) {
    console.warn('[contextoDoAnuncio] fail-open:', e)
    return {}
  }
}
