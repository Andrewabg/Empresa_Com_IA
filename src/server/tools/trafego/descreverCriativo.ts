









import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { runAction as runActionDefault } from '../../actions/actions'
import { composioUserId, metaGraphGet as metaGraphGetImpl } from '../../actions/composio'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { recordCost as recordCostImpl } from '@/data/cost'
import { extrairMidiaRef, isMetaMediaHostAllowed } from '@/lib/trafego/midiaCriativo'
import { transcreverBytes } from '../../openai/transcrever'

interface GenUsage { inputTokens?: number; outputTokens?: number }

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
const VIDEO_SLUG = 'METAADS_GET_VIDEO'
const MAX_BYTES = 25 * 1024 * 1024


const VISION_MAX_BYTES = clampBytes(process.env.TRAFEGO_VISION_MAX_MB, 4)

const VIDEO_MAX_SECONDS = clampSeconds(process.env.TRAFEGO_VIDEO_MAX_SECONDS, 90)
const AD_FIELDS = 'creative{object_story_spec,asset_feed_spec,image_url,video_id,thumbnail_url}'

function clampBytes(rawMb: string | undefined, fallbackMb: number): number {
  const n = Number(rawMb)
  const mb = Number.isFinite(n) && n > 0 && n <= 25 ? n : fallbackMb
  return Math.floor(mb * 1024 * 1024)
}
function clampSeconds(raw: string | undefined, fallback: number): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 && n <= 3600 ? Math.floor(n) : fallback
}

export interface DescricaoCriativo { tipo: 'imagem' | 'video'; descricao: string }
export interface DescreverCriativoCtx { adId: string; actingAgentId?: string }
export interface DescreverCriativoDeps {
  graphGet?: (path: string) => Promise<Record<string, unknown> | null>
  run?: typeof runActionDefault
  describeImage?: (bytes: Uint8Array, mediaType: string) => Promise<{ text: string; usage: GenUsage } | null>
  transcrever?: typeof transcreverBytes
  fetchImpl?: typeof fetch
  recordCost?: typeof recordCostImpl
  maxBytes?: number         
  visionMaxBytes?: number   
  videoMaxSeconds?: number  
}

async function defaultDescribeImage(bytes: Uint8Array, mediaType: string): Promise<{ text: string; usage: GenUsage } | null> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) return null
  const openai = createOpenAI({ apiKey })
  const { text, usage } = await generateText({
    model: openai(MODEL),
    messages: [{ role: 'user', content: [
      { type: 'text', text: 'Descreva objetivamente o que aparece nesta imagem de anúncio: cena, elementos visuais, texto sobreposto/CTA, oferta e tom. Seja factual, sem opinar.' },
      { type: 'image', image: bytes, mediaType },
    ] }],
  })
  return { text, usage }
}

export async function descreverCriativo(
  ctx: DescreverCriativoCtx,
  deps: DescreverCriativoDeps = {},
): Promise<DescricaoCriativo | null> {
  const graphGet = deps.graphGet ?? ((path: string) => metaGraphGetImpl(path))
  const run = deps.run ?? runActionDefault
  const describeImage = deps.describeImage ?? defaultDescribeImage
  const transcrever = deps.transcrever ?? transcreverBytes
  const fetchImpl = deps.fetchImpl ?? fetch
  const recordCost = deps.recordCost ?? recordCostImpl
  const maxBytes = deps.maxBytes ?? MAX_BYTES
  const visionMaxBytes = Math.min(deps.visionMaxBytes ?? VISION_MAX_BYTES, maxBytes)
  const videoMaxSeconds = deps.videoMaxSeconds ?? VIDEO_MAX_SECONDS
  const agent = ctx.actingAgentId ?? 'gestor-trafego'

  try {
    const g = await graphGet(`/${ctx.adId}?fields=${AD_FIELDS}`)
    if (!g) return null
    const ref = extrairMidiaRef((g as { creative?: unknown }).creative)
    if (!ref) return null

    if (ref.tipo === 'imagem') {
      
      if (!isMetaMediaHostAllowed(ref.imageUrl)) return null
      const dl = await fetchImpl(ref.imageUrl)
      if (!dl.ok) return null
      
      
      const declarado = Number(dl.headers?.get?.('content-length') ?? 0)
      if (declarado > visionMaxBytes) return null
      const bytes = new Uint8Array(await dl.arrayBuffer())
      if (bytes.length === 0 || bytes.length > visionMaxBytes) return null
      const mediaType = dl.headers?.get?.('content-type') ?? 'image/jpeg'
      const img = await describeImage(bytes, mediaType)
      if (!img || !img.text.trim()) return null
      try {
        await recordCost({ kind: 'chat', model: MODEL, promptTokens: img.usage.inputTokens ?? 0, completionTokens: img.usage.outputTokens ?? 0, agent, tool: 'descreverCriativo' })
      } catch {  }
      return { tipo: 'imagem', descricao: img.text.trim() }
    }

    
    const v = await run({ slug: VIDEO_SLUG, args: { video_id: ref.videoId, fields: 'source,length' }, userId: composioUserId(), agent })
    const vdata = (v?.successful ? (v.data as { source?: string; length?: number | string }) : undefined) ?? undefined
    const source = vdata?.source
    if (!source) return null
    
    
    const dur = Number(vdata?.length ?? 0)
    if (Number.isFinite(dur) && dur > videoMaxSeconds) return null
    
    if (!isMetaMediaHostAllowed(source)) return null
    const dl = await fetchImpl(source)
    if (!dl.ok) return null
    
    
    const declarado = Number(dl.headers?.get?.('content-length') ?? 0)
    if (declarado > maxBytes) return null
    const bytes = new Uint8Array(await dl.arrayBuffer())
    if (bytes.length === 0 || bytes.length > maxBytes) return null
    const t = await transcrever({ bytes, mime: 'video/mp4' })
    if (!t || !t.text.trim()) return null
    try {
      await recordCost({ kind: 'chat', model: 'gpt-4o-transcribe', promptTokens: t.usage?.input_tokens ?? t.usage?.prompt_tokens ?? 0, completionTokens: t.usage?.output_tokens ?? 0, agent, tool: 'descreverCriativo' })
    } catch {  }
    return { tipo: 'video', descricao: t.text.trim() }
  } catch (e) {
    console.warn('[descreverCriativo] falhou (fail-open):', e instanceof Error ? e.message : e)
    return null
  }
}
