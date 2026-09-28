


import {
  getDraft as getDraftReal,
  upsertDraft as upsertDraftReal,
  deleteDraft as deleteDraftReal,
  insertVersion as insertVersionReal,
  latestVersion as latestVersionReal,
  type DraftRow,
} from '@/data/agentConfigDrafts'
import { readLiveSnapshot as readLiveSnapshotReal, applySnapshot as applySnapshotReal } from '@/server/canais/channelConfig'
import { aplicarBaseOps as aplicarBaseOpsReal } from '@/server/canais/aplicarBaseOps'
import { invalidateAgentCache as invalidateAgentCacheReal } from '@/server/agent/jarvis'
import { invalidateConnectionsCache as invalidateConnectionsCacheReal } from '@/server/config/connections'
import {
  mergeDelta,
  detectarConflitos,
  type ChannelConfigDelta,
  type ChannelConfigSnapshot,
  type CampoConflito,
} from '@/lib/canais/configSnapshot'




export interface RascunhoDeps {
  getDraft?: typeof getDraftReal
  upsertDraft?: typeof upsertDraftReal
  deleteDraft?: typeof deleteDraftReal
  insertVersion?: typeof insertVersionReal
  latestVersion?: typeof latestVersionReal
  readLiveSnapshot?: typeof readLiveSnapshotReal
  applySnapshot?: typeof applySnapshotReal
  invalidateAgentCache?: typeof invalidateAgentCacheReal
  invalidateConnectionsCache?: typeof invalidateConnectionsCacheReal
  aplicarBaseOps?: typeof aplicarBaseOpsReal
}


function toolkitsMudaram(a: string[] | undefined, b: string[] | undefined): boolean {
  const sa = JSON.stringify(a ?? [])
  const sb = JSON.stringify(b ?? [])
  return sa !== sb
}






export async function salvarDelta(
  agentId: string,
  delta: ChannelConfigDelta,
  updatedBy: string | null,
  deps: RascunhoDeps = {},
): Promise<DraftRow> {
  const getDraftFn = deps.getDraft ?? getDraftReal
  const readLive = deps.readLiveSnapshot ?? readLiveSnapshotReal
  const upsert = deps.upsertDraft ?? upsertDraftReal

  const existente = await getDraftFn(agentId)
  const base: ChannelConfigSnapshot = existente
    ? existente.base_snapshot
    : await readLive(agentId)

  return upsert(agentId, delta, base, updatedBy)
}





export interface PublicarResult {
  ok: boolean
  conflitos: CampoConflito[]
}

export async function publicar(
  agentId: string,
  opts: { confirmar: boolean; publishedBy?: string | null },
  deps: RascunhoDeps = {},
): Promise<PublicarResult> {
  const getDraftFn = deps.getDraft ?? getDraftReal
  const readLive = deps.readLiveSnapshot ?? readLiveSnapshotReal
  const archive = deps.insertVersion ?? insertVersionReal
  const apply = deps.applySnapshot ?? applySnapshotReal
  const invalidate = deps.invalidateAgentCache ?? invalidateAgentCacheReal
  const invalidateConnections = deps.invalidateConnectionsCache ?? invalidateConnectionsCacheReal
  const clear = deps.deleteDraft ?? deleteDraftReal

  const draft = await getDraftFn(agentId)
  if (!draft) return { ok: true, conflitos: [] }

  const vivo = await readLive(agentId)
  const conflitos = detectarConflitos(draft.base_snapshot, vivo, draft.delta)

  if (conflitos.length && !opts.confirmar) return { ok: false, conflitos }

  const alvo = mergeDelta(vivo, draft.delta)
  await archive(agentId, vivo, opts.publishedBy ?? null)
  await apply(agentId, alvo, vivo)
  if (draft.delta.base) {
    const aplicarBase = deps.aplicarBaseOps ?? aplicarBaseOpsReal
    await aplicarBase(agentId, draft.delta.base)
  }
  invalidate()
  if (toolkitsMudaram(vivo.tools?.required_toolkits, alvo.tools?.required_toolkits)) {
    invalidateConnections()
  }
  await clear(agentId)

  return { ok: true, conflitos }
}




export async function descartar(agentId: string, deps: RascunhoDeps = {}): Promise<void> {
  const clear = deps.deleteDraft ?? deleteDraftReal
  await clear(agentId)
}





export interface ReverterResult {
  ok: boolean
}

export async function reverter(
  agentId: string,
  _opts: { publishedBy?: string | null } = {},
  deps: RascunhoDeps = {},
): Promise<ReverterResult> {
  const getLatest = deps.latestVersion ?? latestVersionReal
  const readLive = deps.readLiveSnapshot ?? readLiveSnapshotReal
  const archive = deps.insertVersion ?? insertVersionReal
  const apply = deps.applySnapshot ?? applySnapshotReal
  const invalidate = deps.invalidateAgentCache ?? invalidateAgentCacheReal
  const invalidateConnections = deps.invalidateConnectionsCache ?? invalidateConnectionsCacheReal

  const anterior = await getLatest(agentId)
  if (!anterior) return { ok: false }

  const vivoAtual = await readLive(agentId)
  await archive(agentId, vivoAtual, _opts.publishedBy ?? null)
  await apply(agentId, anterior, vivoAtual)
  invalidate()
  if (toolkitsMudaram(vivoAtual.tools?.required_toolkits, anterior.tools?.required_toolkits)) {
    invalidateConnections()
  }

  return { ok: true }
}
