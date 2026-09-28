


import { z } from 'zod'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { generateBackgroundObject } from '../../cost/backgroundLLM'
import { EXTRACTION_MAX_OUTPUT } from '@/lib/llm-tuning'
import { getDefaultBrand as getBrandImpl } from '@/data/brands'
import { getBrandVoice as getVoiceImpl, upsertBrandVoice as upsertVoiceImpl } from '@/data/brandVoice'
import { createSwipe as createSwipeImpl, toSwipeView } from '@/data/swipes'
import { mergeBrandVoice } from '@/lib/estudio/brandVoice'
import { espelharVozNoCerebro, espelharSwipeNoCerebro } from './espelhoCerebro'
import type { EstudioPatch } from '@/lib/estudio/types'
import { materialCercado } from '@/lib/estudio/materialColado'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


const ConcorrenteSchema = z.object({
  titulo: z.string(),
  angulo: z.string(),
  promessa: z.string(),
  gatilhos: z.array(z.string()),
  fraquezas: z.array(z.string()),
  diferenciacao: z.array(z.string()), 
  porqueFunciona: z.string(),
  gancho: z.string(),
  estrutura: z.array(z.string()),
})

interface GenUsage { inputTokens?: number; outputTokens?: number }
export interface AnalisarCtx { operatorId?: string; actingAgentId?: string }
export interface AnalisarDeps {
  getDefaultBrand?: typeof getBrandImpl
  getBrandVoice?: typeof getVoiceImpl
  upsertBrandVoice?: typeof upsertVoiceImpl
  createSwipe?: typeof createSwipeImpl
  espelharVoz?: typeof espelharVozNoCerebro
  espelharSwipe?: typeof espelharSwipeNoCerebro
  generate?: (args: { prompt: string }) => Promise<{ object: unknown; usage: GenUsage; model?: string }>
  recordCost?: typeof recordCostImpl
  now?: () => string
}
export interface AnalisarResult { output: string; patches: EstudioPatch[] }

async function defaultGenerate({ prompt }: { prompt: string }): Promise<{ object: unknown; usage: GenUsage; model: string }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const { object, usage, model } = await generateBackgroundObject({ schema: ConcorrenteSchema, prompt, maxOutputTokens: EXTRACTION_MAX_OUTPUT })
  return { object, usage, model }
}

export async function analisarConcorrente(
  input: { material?: string; fonte?: string }, ctx: AnalisarCtx, deps: AnalisarDeps = {},
): Promise<AnalisarResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patches: [] }
  const material = (input.material ?? '').trim()
  if (!material) {
    return { output: 'Me cola a copy/página do concorrente que você quer que eu desmonte — eu mapeio o ângulo, promessa e fraquezas, e registro como a gente se diferencia.', patches: [] }
  }
  const getBrand = deps.getDefaultBrand ?? getBrandImpl
  const getVoice = deps.getBrandVoice ?? getVoiceImpl
  const upsert = deps.upsertBrandVoice ?? upsertVoiceImpl
  const createSwipe = deps.createSwipe ?? createSwipeImpl
  const espelharVoz = deps.espelharVoz ?? espelharVozNoCerebro
  const espelharSwipe = deps.espelharSwipe ?? espelharSwipeNoCerebro
  const generate = deps.generate ?? defaultGenerate
  const recordCost = deps.recordCost ?? recordCostImpl
  const now = deps.now ?? (() => new Date().toISOString())
  const agentId = ctx.actingAgentId ?? 'copywriter'

  const brand = await getBrand(ctx.operatorId)
  if (!brand) return { output: 'Ainda não conheço a marca — vamos fazer a entrevista de marca primeiro?', patches: [] }

  const prompt = `Você é estrategista de copy desmontando UM CONCORRENTE a partir do material colado. SEM inventar. Devolva:
- titulo: rótulo curto do concorrente/peça.
- angulo: o ângulo central que o concorrente usa.
- promessa: a promessa principal dele.
- gatilhos: gatilhos mentais que ele usa.
- fraquezas: brechas/fraquezas da copy dele que a marca pode explorar.
- diferenciacao: como a NOSSA marca se distingue dele (frases curtas, duráveis).
- porqueFunciona / gancho / estrutura: a desmontagem da peça dele (pro swipe file).

MATERIAL DO CONCORRENTE:
${materialCercado(material)}`

  const { object, usage, model } = await generate({ prompt })
  try { await recordCost({ kind: 'chat', model: model ?? MODEL, promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0, agent: agentId, tool: 'analisarConcorrente' }) } catch {  }

  const o = ConcorrenteSchema.parse(object)

  
  const atual = await getVoice(ctx.operatorId, brand.id)
  
  const next = mergeBrandVoice(atual, { dna: { diferenciacao: o.diferenciacao } }, { origem: 'reflector', at: now() })
  await upsert(ctx.operatorId, brand.id, next)
  try { await espelharVoz({ slug: brand.slug, nomeMarca: brand.nome, voice: next }) } catch {  }
  const dnaPatch: EstudioPatch = { op: 'upsert', entidade: 'dna', voice: next }

  
  const row = await createSwipe({
    operatorId: ctx.operatorId, brandId: brand.id, agentId,
    titulo: `Concorrente: ${o.titulo}`, fonte: input.fonte, conteudo: material,
    desmontagem: { porqueFunciona: o.porqueFunciona, gancho: o.gancho, estrutura: o.estrutura, gatilhos: o.gatilhos, angulo: o.angulo },
    tags: ['concorrente'], origem: agentId,
  })
  const swipe = toSwipeView(row)
  try { await espelharSwipe({ slug: brand.slug, swipe }) } catch {  }
  const swipePatch: EstudioPatch = { op: 'upsert', entidade: 'swipe', swipe }

  const output = `Desmontei o concorrente "${o.titulo}": ângulo "${o.angulo}", promessa "${o.promessa}". Registrei como a gente se diferencia na Ficha e guardei a desmontagem no swipe file (marcada como concorrente).`
  return { output, patches: [dnaPatch, swipePatch] }
}
