

import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getDefaultBrand as getDefaultBrandImpl } from '@/data/brands'
import { getBrandVoice as getBrandVoiceImpl } from '@/data/brandVoice'
import { createCampanha as createCampanhaImpl } from '@/data/campanhas'
import { toCampanhaView } from '@/data/campanhas'
import { renderBrandVoice } from '@/lib/estudio/brandVoice'
import { normalizarPlanoItem } from '@/lib/estudio/campanha'
import { conferirPlanoContraPedido, lerQuantidades, renderQuantidades, totalPedido } from '@/lib/estudio/quantidades'
import { getFormato } from '@/lib/estudio/formatos'
import { renderBriefParaPrompt } from '@/lib/estudio/renderBrief'
import { promptPlanejarCampanha } from './prompts'
import { listSwipes as listSwipesImpl, toSwipeView } from '@/data/swipes'
import { renderSwipesParaPrompt, selecionarSwipesDaCampanha } from '@/lib/estudio/selecionarSwipes'
import type { EstudioPatch, SwipeView } from '@/lib/estudio/types'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


async function defaultLerSwipes(operatorId: string, brandId: string, _formato: string): Promise<SwipeView[]> {
  const rows = await listSwipesImpl(operatorId, brandId)
  return rows.map(toSwipeView)
}

interface GenUsage { inputTokens?: number; outputTokens?: number }

export interface PlanejarCampanhaInput { brief?: Record<string, unknown> }
export interface PlanejarCampanhaCtx { operatorId?: string; actingAgentId?: string }
export interface PlanejarDeps {
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage }>
  getDefaultBrand?: typeof getDefaultBrandImpl
  getBrandVoice?: typeof getBrandVoiceImpl
  createCampanha?: typeof createCampanhaImpl
  recordCost?: typeof recordCostImpl
  lerSwipesRelevantes?: (operatorId: string, brandId: string, formato: string) => Promise<SwipeView[]>
}
export interface PlanejarCampanhaResult {
  output: string
  patch: EstudioPatch | null
  
  avisos: string[]
}


const PlanoSchema = z.object({
  nome: z.string(),
  big_idea: z.string(),
  plano: z.array(z.object({ formato: z.string(), canal: z.string(), angulo: z.string(), justificativa: z.string() })),
})

async function defaultGenerate({ prompt, schema }: { prompt: string; schema: z.ZodType<unknown> }): Promise<{ object: unknown; usage: GenUsage }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({ model: openai(MODEL), schema, prompt })
  return { object, usage }
}

export const COPY_PLANEJAR = {
  semPlano: 'Não consegui montar o plano agora. Tenta de novo?',
  cortadas: (nomes: string[]) =>
    `Tirei ${nomes.length} peça(s) que passavam do que você pediu (${[...new Set(nomes)].join(', ')}).`,
  faltas: (faltas: string[]) =>
    `Não fechei tudo o que você pediu: ${faltas.join('; ')}. Me diz o ângulo que falta e eu completo.`,
} as const


function parse<T>(object: unknown, schema: z.ZodType<T>): T | null {
  const r = schema.safeParse(object)
  return r.success ? r.data : null
}

export async function planejarCampanha(
  input: PlanejarCampanhaInput, ctx: PlanejarCampanhaCtx, deps: PlanejarDeps = {},
): Promise<PlanejarCampanhaResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null, avisos: [] }
  const generate = deps.generate ?? defaultGenerate
  const getDefaultBrand = deps.getDefaultBrand ?? getDefaultBrandImpl
  const getBrandVoice = deps.getBrandVoice ?? getBrandVoiceImpl
  const createCampanha = deps.createCampanha ?? createCampanhaImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const lerSwipes = deps.lerSwipesRelevantes ?? defaultLerSwipes
  const agentId = ctx.actingAgentId ?? 'copywriter'

  const brand = await getDefaultBrand(ctx.operatorId)
  if (!brand) return { output: 'Ainda não conheço a marca. Vamos fazer a entrevista de marca primeiro?', patch: null, avisos: [] }
  const voice = await getBrandVoice(ctx.operatorId, brand.id)

  const brief = input.brief ?? {}
  const objetivo = typeof brief.objetivo === 'string' ? brief.objetivo.trim() : ''
  if (!objetivo) {
    return {
      output: 'Antes de planejar a campanha, me diz: qual o objetivo? (ex.: lançar o curso X, vender mais do produto Y). E pra qual público e em quais canais?',
      patch: null,
      avisos: [],
    }
  }

  
  let swipesBlock = ''
  try {
    
    
    
    const canais = Object.keys(lerQuantidades(brief))
      .map((slug) => getFormato(slug)?.canal)
      .filter((c): c is string => !!c)
    const todos = await lerSwipes(ctx.operatorId, brand.id, '')
    swipesBlock = renderSwipesParaPrompt(selecionarSwipesDaCampanha(todos, canais, 3))
  } catch (e) {
    console.warn('[planejarCampanha] leitura de swipes falhou (fail-open):', e)
  }

  const vozRender = renderBrandVoice(voice)
  const briefStr = renderBriefParaPrompt(brief)

  const record = async (u: GenUsage) => {
    try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: u.inputTokens ?? 0, completionTokens: u.outputTokens ?? 0, agent: agentId, tool: 'planejarCampanha' }) } catch {  }
  }

  const pedido = lerQuantidades(brief)
  const { object, usage } = await generate({
    prompt: promptPlanejarCampanha({
      vozRender, brief: briefStr, swipes: swipesBlock,
      ...(totalPedido(pedido) ? { quantidades: renderQuantidades(pedido) } : {}),
    }),
    schema: PlanoSchema,
  })
  await record(usage)

  const obj = parse(object, PlanoSchema)
  if (!obj || !obj.plano.length) return { output: COPY_PLANEJAR.semPlano, patch: null, avisos: [] }

  
  const conferido = conferirPlanoContraPedido(obj.plano.map(normalizarPlanoItem), pedido)
  const plano = conferido.plano
  if (!plano.length) return { output: COPY_PLANEJAR.semPlano, patch: null, avisos: [] }
  const row = await createCampanha({ operatorId: ctx.operatorId, brandId: brand.id, agentId, nome: obj.nome, bigIdea: obj.big_idea, brief, plano })

  const patch: EstudioPatch = { op: 'upsert', entidade: 'campanha', campanha: toCampanhaView(row) }
  const avisos = [
    ...(conferido.cortadas.length ? [COPY_PLANEJAR.cortadas(conferido.cortadas)] : []),
    ...(conferido.faltas.length ? [COPY_PLANEJAR.faltas(conferido.faltas)] : []),
  ]
  const output = [
    `Montei a campanha "${obj.nome}": ${obj.big_idea}. São ${plano.length} peças no plano.`,
    ...avisos,
    'Quando você aprovar, eu produzo cada uma.',
  ].join(' ')
  return { output, patch, avisos }
}
