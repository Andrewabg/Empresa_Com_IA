




import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getSetting } from '@/data/settings'
import { ensureDefaultBrand as ensureBrandImpl } from '@/data/brands'
import { getBrandVoice as getBrandVoiceImpl, getDirecaoArte as getDirecaoImpl } from '@/data/brandVoice'
import { createPeca as createPecaImpl } from '@/data/pecas'
import { renderBrandVoice } from '@/lib/estudio/brandVoice'
import { renderDirecaoArte } from '@/lib/design/direcaoArte'
import { inferirFormatoDesign } from '@/lib/design/formatos'
import { briefCoverage, mergeBrief } from '@/lib/design/briefCoverage'
import { toCriativoView, type BriefEstruturado } from '@/lib/design/types'
import { buscarCerebro } from '../buscarCerebro'
import { promptBriefing } from './prompts'
import type { EstudioPatch } from '@/lib/estudio/types'
import { encurtarTitulo } from '@/lib/encurtarTitulo'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
interface GenUsage { inputTokens?: number; outputTokens?: number }


const BriefingSchema = z.object({
  titulo: z.string(),
  objetivo: z.string(),
  publico: z.string(),
  oferta: z.string(),
  angulo: z.string(),
  restricoes: z.string(),
})

export interface IniciarBriefingInput { pedido: string }
export interface IniciarBriefingCtx {
  operatorId?: string
  actingAgentId?: string
  conversationId?: string | null
  
  campanhaId?: string
  
  planoIndex?: number
}
export interface IniciarBriefingDeps {
  generate?: (args: { prompt: string }) => Promise<{ object: unknown; usage: GenUsage }>
  ensureDefaultBrand?: typeof ensureBrandImpl
  getCompanyName?: () => Promise<string | null>
  getBrandVoice?: typeof getBrandVoiceImpl
  getDirecaoArte?: typeof getDirecaoImpl
  lerCerebro?: (pedido: string) => Promise<string>
  createPeca?: typeof createPecaImpl
  recordCost?: typeof recordCostImpl
}
export interface IniciarBriefingResult { output: string; patch: EstudioPatch | null }

async function defaultGenerate({ prompt }: { prompt: string }): Promise<{ object: unknown; usage: GenUsage }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({ model: openai(MODEL), schema: BriefingSchema, prompt })
  return { object, usage }
}


async function defaultLerCerebro(pedido: string): Promise<string> {
  try {
    const notas = await buscarCerebro(pedido, 5)
    return notas.map((n) => `## ${n.título ?? ''}\n${n.trecho}`).join('\n\n').trim()
  } catch (e) { console.warn('[iniciarBriefing] cérebro (fail-open):', e); return '' }
}

function parse<T>(object: unknown, schema: z.ZodType<T>): T | null {
  const r = schema.safeParse(object)
  return r.success ? r.data : null
}

export async function iniciarBriefing(
  input: IniciarBriefingInput, ctx: IniciarBriefingCtx, deps: IniciarBriefingDeps = {},
): Promise<IniciarBriefingResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const generate = deps.generate ?? defaultGenerate
  const ensureBrand = deps.ensureDefaultBrand ?? ensureBrandImpl
  const getCompanyName = deps.getCompanyName ?? (() => getSetting('company_name'))
  const getVoice = deps.getBrandVoice ?? getBrandVoiceImpl
  const getDir = deps.getDirecaoArte ?? getDirecaoImpl
  const lerCerebro = deps.lerCerebro ?? defaultLerCerebro
  const createPeca = deps.createPeca ?? createPecaImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const agentId = ctx.actingAgentId ?? 'designer'
  const pedido = String(input.pedido ?? '').trim()

  
  const nome = (await getCompanyName())?.trim() || 'Minha marca'
  const brand = await ensureBrand(ctx.operatorId, nome)

  const [voice, direcao, notas] = await Promise.all([
    getVoice(ctx.operatorId, brand.id),
    getDir(ctx.operatorId, brand.id),
    lerCerebro(pedido),
  ])
  const dnaVerbal = renderBrandVoice(voice)
  const direcaoRender = renderDirecaoArte(direcao)

  
  const { object, usage } = await generate({ prompt: promptBriefing({ pedido, notas, dnaVerbal, direcaoRender }) })
  try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0, agent: agentId, tool: 'iniciarBriefing' }) } catch {  }
  const pre = parse(object, BriefingSchema)

  
  const brief: BriefEstruturado = mergeBrief(
    pedido ? { pedido } : {},
    { objetivo: pre?.objetivo, oferta: pre?.oferta, publico: pre?.publico, angulo: pre?.angulo, restricoes: pre?.restricoes },
  )
  const titulo = encurtarTitulo((pre?.titulo ?? '').trim() || pedido || 'Anúncio', 80)

  const row = await createPeca({
    operatorId: ctx.operatorId, brandId: brand.id, agentId,
    
    formato: inferirFormatoDesign(pedido), titulo, origem: agentId, status: 'brief',
    
    
    brief: { ...brief, ...(typeof ctx.planoIndex === 'number' ? { planoIndex: ctx.planoIndex } : {}) } as Record<string, unknown>,
    ...(ctx.campanhaId ? { campanhaId: ctx.campanhaId } : {}),
  })

  const criativo = toCriativoView(row, undefined)
  const capturado = [
    brief.objetivo && `objetivo: ${brief.objetivo}`,
    brief.oferta && `oferta: ${brief.oferta}`,
    brief.publico && `público: ${brief.publico}`,
  ].filter(Boolean).join(' · ')
  const primeira = briefCoverage(brief).pendentes[0]
  const output = primeira
    ? `Boa — vou montar "${titulo}".${capturado ? ` Já peguei ${capturado}.` : ''} Pra fechar o briefing: ${primeira.seed}`
    : `Boa — montei o briefing de "${titulo}"${capturado ? ` (${capturado})` : ''}. Quer ajustar algo ou já gero as provas?`
  return { output, patch: { op: 'upsert', entidade: 'criativo', criativo } }
}
