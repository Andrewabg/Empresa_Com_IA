
import { generateImage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createHash } from 'node:crypto'
import { getSecret, SECRET_KEYS } from '../secrets'
import { NotConfiguredError } from '../brain/runtime'
import { serverDb } from '../supabase'
import { createArtifact as createArtifactDefault, type ArtifactRow, type CreateArtifactInput } from '../../data/artifacts'
import { recordCost as recordCostDefault, type RecordCostInput } from '../../data/cost'
import { chaveImagem, settingKeyImagem } from '@/lib/design/imagemDedup'
import { getSetting as getSettingDefault, setSetting as setSettingDefault } from '@/data/settings'
import { classificarFalhaDaImagem, textoDaFalhaDaImagem } from '@/lib/design/falhaDaImagem'
import { encurtarTitulo } from '@/lib/encurtarTitulo'

export interface GerarImagemInput { prompt: string; tamanho?: string }
export interface GerarImagemCtx { conversationId?: string | null; taskId?: string | null; agentId: string }
export interface GerarImagemResult { output: string; artifact: ArtifactRow | null }


export interface GenImagemUsage { inputTokens?: number; outputTokens?: number }

export interface GerarImagemDeps {
  generate?: (args: { prompt: string; size: string }) => Promise<{ base64: string; size: string; usage: GenImagemUsage }>
  upload?: (path: string, base64: string) => Promise<string>
  create?: (input: CreateArtifactInput) => Promise<ArtifactRow>
  record?: (input: RecordCostInput) => Promise<void>
  
  getCache?: (key: string) => Promise<string | null>
  setCache?: (key: string, value: string) => Promise<void>
}

const DEFAULT_SIZE = '1024x1024'

const IMAGE_QUALITY = 'medium' as const

export async function gerarImagem(
  input: GerarImagemInput,
  ctx: GerarImagemCtx,
  deps: GerarImagemDeps = {},
): Promise<GerarImagemResult> {
  const prompt = String(input.prompt ?? '').trim()
  if (!prompt) return { output: 'Preciso de uma descrição para gerar a imagem.', artifact: null }
  const size = input.tamanho || DEFAULT_SIZE

  const generate = deps.generate ?? (async ({ prompt: p, size: s }) => {
    const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
    if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
    const openai = createOpenAI({ apiKey })
    
    
    
    const { image, usage } = await generateImage({
      model: openai.image('gpt-image-2'),
      prompt: p,
      size: s as `${number}x${number}`,
      providerOptions: { openai: { quality: IMAGE_QUALITY } },
    })
    return { base64: image.base64, size: s, usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } }
  })
  const upload = deps.upload ?? (async (path, base64) => {
    const bytes = Buffer.from(base64, 'base64')
    const { error } = await serverDb().storage.from('artifacts').upload(path, bytes, { contentType: 'image/png', upsert: true })
    if (error) throw new Error(`upload imagem: ${error.message}`)
    return path
  })
  const create = deps.create ?? createArtifactDefault
  const record = deps.record ?? recordCostDefault
  const getCache = deps.getCache ?? getSettingDefault
  const setCache = deps.setCache ?? setSettingDefault

  
  const dedupKey = settingKeyImagem(chaveImagem({ prompt, size, quality: IMAGE_QUALITY }))
  const cachedRef = await getCache(dedupKey).catch(() => null)
  if (cachedRef) {
    const artifact = await create({
      conversation_id: ctx.conversationId ?? null,
      task_id: ctx.taskId ?? null,
      agent_id: ctx.agentId,
      kind: 'imagem',
      title: encurtarTitulo(prompt, 60),
      storage_ref: cachedRef,
    })
    return { output: `Imagem gerada — o operador já a recebe no canal onde está.`, artifact }
  }

  
  
  
  
  
  
  
  let gen: { base64: string; usage: { inputTokens?: number; outputTokens?: number } }
  try {
    gen = await generate({ prompt, size })
  } catch (e) {
    if (e instanceof NotConfiguredError) throw e
    console.error('[tools/gerarImagem] render falhou:', e)
    return { output: textoDaFalhaDaImagem(classificarFalhaDaImagem(e), 'a imagem'), artifact: null }
  }

  
  
  
  
  
  try {
    await record({
      kind: 'action', model: 'gpt-image-2',
      promptTokens: gen.usage.inputTokens ?? 0, completionTokens: gen.usage.outputTokens ?? 0,
      tool: 'gerarImagem', agent: ctx.agentId,
    })
  } catch {  }

  
  
  const hashHex = createHash('sha256').update(gen.base64).digest('hex').slice(0, 16)
  const path = `${ctx.conversationId ?? 'sem-conversa'}/${hashHex}.png`
  const storageRef = await upload(path, gen.base64)
  
  try { await setCache(dedupKey, storageRef) } catch {  }
  const artifact = await create({
    conversation_id: ctx.conversationId ?? null,
    task_id: ctx.taskId ?? null,
    agent_id: ctx.agentId,
    kind: 'imagem',
    title: encurtarTitulo(prompt, 60),
    storage_ref: storageRef,
  })
  
  
  return { output: `Imagem gerada — o operador já a recebe no canal onde está.`, artifact }
}
