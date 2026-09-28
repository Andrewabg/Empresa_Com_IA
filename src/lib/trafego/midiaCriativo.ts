


export type MidiaRef =
  | { tipo: 'video'; videoId: string; imageUrl?: string }
  | { tipo: 'imagem'; imageUrl: string }

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}





const META_CDN_SUFFIXES = ['fbcdn.net', 'cdninstagram.com', 'fbsbx.com']
export function isMetaMediaHostAllowed(rawUrl: unknown): boolean {
  if (typeof rawUrl !== 'string') return false
  let u: URL
  try { u = new URL(rawUrl) } catch { return false }
  if (u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase()
  return META_CDN_SUFFIXES.some((s) => host === s || host.endsWith('.' + s))
}

export function extrairMidiaRef(creative: unknown): MidiaRef | null {
  const c = (creative ?? {}) as Record<string, any>
  const oss = c.object_story_spec ?? {}
  const afs = c.asset_feed_spec ?? {}

  
  const videoId =
    str(oss.video_data?.video_id) ??
    str(afs.videos?.[0]?.video_id) ??
    str(c.video_id)
  if (videoId) {
    const thumb = str(oss.video_data?.image_url) ?? str(afs.videos?.[0]?.thumbnail_url) ?? str(c.thumbnail_url)
    return thumb ? { tipo: 'video', videoId, imageUrl: thumb } : { tipo: 'video', videoId }
  }

  
  const imageUrl =
    str(oss.link_data?.picture) ??
    str(afs.images?.[0]?.url) ??
    str(c.image_url)
  if (imageUrl) return { tipo: 'imagem', imageUrl }

  return null
}
