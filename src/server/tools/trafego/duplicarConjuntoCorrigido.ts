
import type { ComposioClient } from '@/server/actions/composio'
import { metaGraphPost as metaGraphPostDefault } from '@/server/actions/composio'
import { recordActionCost as recordActionCostDefault } from '@/server/actions/actions'

export interface DuplicarPayload {
  adsetId: string
  correcao: { optimization_goal: string; promoted_object: { pixel_id: string; custom_event_type: string } }
}
export interface DuplicarCtx { agent: string; composio: ComposioClient }
export interface DuplicarResultado { copiedAdsetId: string; resumo: string }
export interface DuplicarDeps {
  metaGraphPost?: typeof metaGraphPostDefault
  recordActionCost?: typeof recordActionCostDefault
  resolveConnectedAccountId?: (composio: ComposioClient) => Promise<string | null>
}

async function defaultResolveConnectedAccountId(c: ComposioClient): Promise<string | null> {
  try {
    const conns = await (c.connectedAccounts as { list: (q: unknown, o?: unknown) => Promise<{ items?: Array<{ id?: string; toolkit?: { slug?: string }; toolkitSlug?: string }> }> })
      .list({ userIds: [process.env.COMPOSIO_USER_ID ?? 'operator'] }, { signal: AbortSignal.timeout(10000) })
    const items = conns?.items ?? []
    return items.find((a) => (a?.toolkit?.slug ?? a?.toolkitSlug) === 'metaads')?.id ?? null
  } catch { return null }
}

export async function duplicarConjuntoCorrigido(
  payload: DuplicarPayload,
  ctx: DuplicarCtx,
  deps: DuplicarDeps = {},
): Promise<DuplicarResultado> {
  const postGraph = deps.metaGraphPost ?? metaGraphPostDefault
  const recCost = deps.recordActionCost ?? recordActionCostDefault
  const resolveConn = deps.resolveConnectedAccountId ?? defaultResolveConnectedAccountId

  
  const connectedAccountId = await resolveConn(ctx.composio)

  
  const res1 = await postGraph(
    '/' + payload.adsetId + '/copies',
    { deep_copy: true, status_option: 'PAUSED' },
    { composio: ctx.composio, connectedAccountId },
  )
  if (!res1.ok) {
    
    throw Object.assign(new Error(res1.error ?? 'falha ao copiar o conjunto no Meta'), { status: res1.status })
  }

  const copiedAdsetId = String((res1.data as { copied_adset_id?: unknown })?.copied_adset_id ?? '')
  if (!copiedAdsetId) {
    
    throw new Error('Não consegui confirmar a cópia do conjunto (pode ter ido pra processamento em segundo plano). Tente de novo.')
  }

  
  const res2 = await postGraph(
    '/' + copiedAdsetId,
    payload.correcao,
    { composio: ctx.composio, connectedAccountId },
  )
  if (!res2.ok) {
    
    
    
    
    
    const detalhe = String(res2.error ?? 'erro no Meta').replace(/\b40[13]\b/g, '4xx')
    throw new Error('A cópia foi criada (conjunto ' + copiedAdsetId + ') mas a correção NÃO foi aplicada: ' + detalhe + '. Pause ou exclua essa cópia e tente de novo.')
  }

  
  await recCost('METAADS_DUPLICATE_ADSET', ctx.agent)

  return {
    copiedAdsetId,
    resumo: 'Cópia criada PAUSADA (conjunto ' + copiedAdsetId + ') com a otimização corrigida. Ative quando quiser.',
  }
}
