
import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getDefaultBrand as getBrandImpl } from '@/data/brands'
import { createSwipe as createSwipeImpl, toSwipeView } from '@/data/swipes'
import { espelharSwipeNoCerebro } from './espelhoCerebro'
import type { EstudioPatch } from '@/lib/estudio/types'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


const DesmontagemSchema = z.object({
  titulo: z.string(),
  porqueFunciona: z.string(),
  gancho: z.string(),
  estrutura: z.array(z.string()),
  gatilhos: z.array(z.string()),
  angulo: z.string(),
  tags: z.array(z.string()),  
})

interface GenUsage { inputTokens?: number; outputTokens?: number }
export interface GuardarSwipeCtx { operatorId?: string; actingAgentId?: string }
export interface GuardarSwipeDeps {
  getDefaultBrand?: typeof getBrandImpl
  createSwipe?: typeof createSwipeImpl
  espelhar?: typeof espelharSwipeNoCerebro
  generate?: (args: { prompt: string }) => Promise<{ object: unknown; usage: GenUsage }>
  recordCost?: typeof recordCostImpl
}
export interface GuardarSwipeResult { output: string; patch: EstudioPatch | null }

async function defaultGenerate({ prompt }: { prompt: string }): Promise<{ object: unknown; usage: GenUsage }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({ model: openai(MODEL), schema: DesmontagemSchema, prompt })
  return { object, usage }
}

export async function guardarSwipe(
  input: { referencia?: string; fonte?: string }, ctx: GuardarSwipeCtx, deps: GuardarSwipeDeps = {},
): Promise<GuardarSwipeResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const referencia = (input.referencia ?? '').trim()
  if (!referencia) {
    return { output: 'Me cola a referência que você quer guardar (o anúncio, e-mail ou página que funciona) — eu desmonto o porquê e salvo no swipe file.', patch: null }
  }
  const getBrand = deps.getDefaultBrand ?? getBrandImpl
  const createSwipe = deps.createSwipe ?? createSwipeImpl
  const espelhar = deps.espelhar ?? espelharSwipeNoCerebro
  const generate = deps.generate ?? defaultGenerate
  const recordCost = deps.recordCost ?? recordCostImpl
  const agentId = ctx.actingAgentId ?? 'copywriter'

  const brand = await getBrand(ctx.operatorId)
  if (!brand) return { output: 'Ainda não conheço a marca — vamos fazer a entrevista de marca primeiro?', patch: null }

  const prompt = `Você é copywriter desmontando UMA referência que funciona (anúncio/e-mail/página) que o operador colou. Explique POR QUE ela funciona — sem inventar. Devolva:
- titulo: um rótulo curto pra achar depois.
- porqueFunciona: 1-2 frases do mecanismo (por que converte).
- gancho: a primeira linha/abertura que prende.
- estrutura: os blocos na ordem (ex.: ["gancho","agitação","prova","CTA"]).
- gatilhos: gatilhos mentais usados (ex.: urgência, prova social, autoridade).
- angulo: o ângulo central (dor, aspiração, curiosidade…).
- tags: formato/canal/emoção pra indexar (ex.: ["meta-ad","dor"]).

REFERÊNCIA:
${referencia}`

  const { object, usage } = await generate({ prompt })
  try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0, agent: agentId, tool: 'guardarSwipe' }) } catch {  }

  const o = DesmontagemSchema.parse(object)
  const row = await createSwipe({
    operatorId: ctx.operatorId, brandId: brand.id, agentId,
    titulo: o.titulo, fonte: input.fonte, conteudo: referencia,
    desmontagem: { porqueFunciona: o.porqueFunciona, gancho: o.gancho, estrutura: o.estrutura, gatilhos: o.gatilhos, angulo: o.angulo },
    tags: o.tags, origem: agentId,
  })
  const swipe = toSwipeView(row)
  try { await espelhar({ slug: brand.slug, swipe }) } catch {  }

  const patch: EstudioPatch = { op: 'upsert', entidade: 'swipe', swipe }
  const output = `Guardei "${o.titulo}" no swipe file e desmontei o porquê: ${o.porqueFunciona} Vou me inspirar na ESTRUTURA/gatilho quando escrever — nunca copiar a frase.`
  return { output, patch }
}
