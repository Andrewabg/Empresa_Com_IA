



import { listOperadoresComTrafego as listOpsImpl, listLatestSnapshots as listLatestImpl } from '@/data/trafego'
import { listAcoesOrcamentoMaduras as listMadurasImpl } from '@/data/approvals'
import { listChavesMedidas as listChavesImpl } from '@/data/acaoResultados'
import { enqueueMemoryJob as enqueueImpl } from '@/data/memoryJobs'
import { JANELA_MEDICAO_MS, JANELA_APRENDIZADO_MS } from '@/lib/trafego/atribuicao'


const TETO_VARREDURA_MS = JANELA_APRENDIZADO_MS + JANELA_MEDICAO_MS 

export interface AtribuicaoHeartbeatDeps {
  now?: () => number
  listOperadores?: (desdeISO: string) => Promise<string[]>
  contaDoOperador?: (operatorId: string) => Promise<string | null>
  listMaduras?: (desdeISO: string, ateISO: string) => Promise<{ approvalId: string; entityId: string; slug: string; resolvedAt: string }[]>
  listChavesMedidas?: (approvalIds: string[]) => Promise<Set<string>>
  enqueue?: (kind: 'attribution', ref: string) => Promise<{ enqueued: boolean }>
}
export interface AtribuicaoHeartbeatResult { operadores: number; enfileirados: number }

export async function runAtribuicaoHeartbeat(deps: AtribuicaoHeartbeatDeps = {}): Promise<AtribuicaoHeartbeatResult> {
  const now = deps.now ?? (() => Date.now())
  const listOperadores = deps.listOperadores ?? listOpsImpl
  const contaDoOperador = deps.contaDoOperador ?? (async (op: string) => {
    const latest = await listLatestImpl(op, 'account', 1)
    return latest[0]?.entity_id ?? null
  })
  const listMaduras = deps.listMaduras ?? listMadurasImpl
  const listChaves = deps.listChavesMedidas ?? listChavesImpl
  const enqueue = deps.enqueue ?? ((kind: 'attribution', ref: string) => enqueueImpl(kind, ref))

  const agora = now()
  const ate = new Date(agora - JANELA_MEDICAO_MS).toISOString()   
  const desde = new Date(agora - TETO_VARREDURA_MS).toISOString() 

  let ops: string[] = []
  try { ops = await listOperadores(desde) } catch (e) { console.warn('[atribuicao] listOperadores fail-open:', e); return { operadores: 0, enfileirados: 0 } }

  
  
  
  
  
  
  
  let operatorId: string | null = null
  let accountId: string | null = null
  for (const op of ops) {
    try {
      const acc = await contaDoOperador(op)
      if (acc) { operatorId = op; accountId = acc; break }
    } catch (e) { console.warn(`[atribuicao] conta do operador ${op} fail-open:`, e) }
  }
  if (!operatorId || !accountId) return { operadores: ops.length, enfileirados: 0 }

  let enfileirados = 0
  try {
    const maduras = await listMaduras(desde, ate)
    if (maduras.length) {
      const medidas = await listChaves([...new Set(maduras.map((m) => m.approvalId))])
      for (const m of maduras) {
        if (medidas.has(`${m.approvalId}:${m.entityId}`)) continue
        const ref = `${operatorId}:${accountId}:${m.approvalId}:${m.entityId}`
        try { if ((await enqueue('attribution', ref)).enqueued) enfileirados++ } catch (e) { console.warn('[atribuicao] enqueue fail-open:', ref, e) }
      }
    }
  } catch (e) { console.warn('[atribuicao] fail-open:', e) }
  return { operadores: ops.length, enfileirados }
}
