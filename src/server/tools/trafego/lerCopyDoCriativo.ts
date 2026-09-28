


import { metaGraphGet as metaGraphGetImpl } from '../../actions/composio'

export interface CopyDoCriativo {
  message?: string
  headline?: string
  description?: string
}

export interface LerCopyCtx {
  adId: string
  actingAgentId?: string
}

export interface LerCopyDeps {
  graphGet?: (path: string) => Promise<Record<string, unknown> | null>
}

export async function lerCopyDoCriativo(
  ctx: LerCopyCtx,
  deps: LerCopyDeps = {},
): Promise<CopyDoCriativo | null> {
  const graphGet = deps.graphGet ?? ((path: string) => metaGraphGetImpl(path))
  try {
    const g = await graphGet(`/${ctx.adId}?fields=creative{object_story_spec,asset_feed_spec}`)
    if (!g) return null
    const creative = (g as { creative?: any }).creative
    const spec = creative?.object_story_spec
    const ld = spec?.link_data ?? spec?.video_data
    const afs = creative?.asset_feed_spec
    const message = ld?.message ?? afs?.bodies?.[0]?.text
    const headline = ld?.name ?? ld?.title ?? afs?.titles?.[0]?.text
    const description = ld?.description ?? afs?.descriptions?.[0]?.text
    const out: CopyDoCriativo = {}
    if (typeof message === 'string' && message.trim()) out.message = message.trim()
    if (typeof headline === 'string' && headline.trim()) out.headline = headline.trim()
    if (typeof description === 'string' && description.trim()) out.description = description.trim()
    return Object.keys(out).length ? out : null
  } catch (e) {
    console.warn('[lerCopyDoCriativo] falhou (fail-open):', e instanceof Error ? e.message : e)
    return null
  }
}
