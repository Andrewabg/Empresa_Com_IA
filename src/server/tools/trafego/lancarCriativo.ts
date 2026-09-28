
import type { ComposioClient } from '@/server/actions/composio'
import { metaGraphPost as metaGraphPostDefault } from '@/server/actions/composio'
import { recordActionCost as recordActionCostDefault } from '@/server/actions/actions'
import { getArtifact as getArtifactDefault } from '@/data/artifacts'
import { recordEvent as recordEventDefault } from '@/data/events'
import { serverDb } from '@/server/supabase'
import { montarCreativeBody, montarAdBody, contaEndpoint, type LancamentoResolvido } from '@/lib/trafego/lancamentoCriativo'

export interface LancarCriativoCtx { agent: string; composio: ComposioClient }
export interface LancarCriativoResultado { adId: string; creativeId: string; resumo: string }
export interface LancarCriativoDeps {
  metaGraphPost?: typeof metaGraphPostDefault
  getArtifact?: typeof getArtifactDefault
  signArtifactUrl?: (storageRef: string) => Promise<string | null>
  recordActionCost?: typeof recordActionCostDefault
  recordEvent?: typeof recordEventDefault
  resolveConnectedAccountId?: (composio: ComposioClient) => Promise<string | null>
}

async function defaultSignArtifactUrl(storageRef: string): Promise<string | null> {
  const { data, error } = await serverDb().storage.from('artifacts').createSignedUrl(storageRef, 3600)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

async function defaultResolveConnectedAccountId(c: ComposioClient): Promise<string | null> {
  try {
    const conns = await (c.connectedAccounts as { list: (q: unknown, o?: unknown) => Promise<{ items?: Array<{ id?: string; toolkit?: { slug?: string }; toolkitSlug?: string }> }> })
      .list({ userIds: [process.env.COMPOSIO_USER_ID ?? 'operator'] }, { signal: AbortSignal.timeout(10000) })
    const items = conns?.items ?? []
    return items.find((a) => (a?.toolkit?.slug ?? a?.toolkitSlug) === 'metaads')?.id ?? null
  } catch { return null }
}

export async function lancarCriativo(
  payload: LancamentoResolvido,
  ctx: LancarCriativoCtx,
  deps: LancarCriativoDeps = {},
): Promise<LancarCriativoResultado> {
  const postGraph = deps.metaGraphPost ?? metaGraphPostDefault
  const getArt = deps.getArtifact ?? getArtifactDefault
  const signUrl = deps.signArtifactUrl ?? defaultSignArtifactUrl
  const recCost = deps.recordActionCost ?? recordActionCostDefault
  const recEvent = deps.recordEvent ?? recordEventDefault
  const resolveConn = deps.resolveConnectedAccountId ?? defaultResolveConnectedAccountId

  
  const connectedAccountId = await resolveConn(ctx.composio)

  
  const art = await getArt(payload.artifactId)
  if (!art?.storage_ref) throw new Error('A arte não tem imagem (storage_ref vazio) — finalize o criativo no /design.')
  const pictureUrl = await signUrl(art.storage_ref)
  if (!pictureUrl) throw new Error('Não consegui assinar a URL da arte — tente de novo.')

  const endpointConta = contaEndpoint(payload.accountId)

  
  const creativeBody = montarCreativeBody(payload, pictureUrl)
  const resCreative = await postGraph(`${endpointConta}/adcreatives`, creativeBody, { composio: ctx.composio, connectedAccountId })
  if (!resCreative.ok) throw Object.assign(new Error(resCreative.error ?? 'falha ao criar o criativo no Meta'), { status: resCreative.status })
  const creativeId = String((resCreative.data as { id?: unknown })?.id ?? '')
  if (!creativeId) throw new Error('O Meta não devolveu o id do criativo — não consegui criar o anúncio.')

  
  const adBody = montarAdBody(payload, creativeId)
  const resAd = await postGraph(`${endpointConta}/ads`, adBody, { composio: ctx.composio, connectedAccountId })
  if (!resAd.ok) throw Object.assign(new Error(resAd.error ?? 'falha ao criar o anúncio no Meta'), { status: resAd.status })
  const adId = String((resAd.data as { id?: unknown })?.id ?? '')

  
  await recCost('METAADS_LAUNCH_CREATIVE', ctx.agent)

  const resumo = `Anúncio criado PAUSADO no conjunto [${payload.adsetId}] (arte ${payload.artifactId}). Ative quando quiser.`
  try {
    await recEvent({ id: `launch:creative:${creativeId}`, type: 'action', label: resumo, agent: ctx.agent })
  } catch {  }

  return { adId, creativeId, resumo }
}
