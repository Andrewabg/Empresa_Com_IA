


import { z } from 'zod'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { generateBackgroundObject } from '../../cost/backgroundLLM'
import { EXTRACTION_MAX_OUTPUT } from '@/lib/llm-tuning'
import { getDefaultBrand as getBrandImpl } from '@/data/brands'
import { getBrandVoice as getVoiceImpl, upsertBrandVoice as upsertVoiceImpl } from '@/data/brandVoice'
import { mergeBrandVoice, type BrandVoicePatch } from '@/lib/estudio/brandVoice'
import { espelharVozNoCerebro } from './espelhoCerebro'
import type { EstudioPatch } from '@/lib/estudio/types'
import { materialCercado } from '@/lib/estudio/materialColado'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


const VozPublicoSchema = z.object({
  frasesExatas: z.array(z.string()),  
  vocabulario: z.array(z.string()),   
  dores: z.array(z.string()),
  desejos: z.array(z.string()),
  objecoes: z.array(z.string()),
})

interface GenUsage { inputTokens?: number; outputTokens?: number }
export interface MinerarCtx { operatorId?: string; actingAgentId?: string }
export interface MinerarDeps {
  getDefaultBrand?: typeof getBrandImpl
  getBrandVoice?: typeof getVoiceImpl
  upsertBrandVoice?: typeof upsertVoiceImpl
  espelhar?: typeof espelharVozNoCerebro
  generate?: (args: { prompt: string }) => Promise<{ object: unknown; usage: GenUsage; model?: string }>
  recordCost?: typeof recordCostImpl
  now?: () => string
}
export interface MinerarResult { output: string; patch: EstudioPatch | null }

async function defaultGenerate({ prompt }: { prompt: string }): Promise<{ object: unknown; usage: GenUsage; model: string }> {
  
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const { object, usage, model } = await generateBackgroundObject({ schema: VozPublicoSchema, prompt, maxOutputTokens: EXTRACTION_MAX_OUTPUT })
  return { object, usage, model }
}

function toPatch(o: z.infer<typeof VozPublicoSchema>): BrandVoicePatch {
  return {
    dna: {
      publico: { dores: o.dores, desejos: o.desejos, objecoes: o.objecoes },
      vozDoPublico: { frasesExatas: o.frasesExatas, vocabulario: o.vocabulario },
    },
  }
}

export async function minerarVozDoPublico(
  input: { material?: string }, ctx: MinerarCtx, deps: MinerarDeps = {},
): Promise<MinerarResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const material = (input.material ?? '').trim()
  if (!material) {
    return { output: 'Me cola aqui o material cru do público — reviews, comentários, DMs, prints de conversa ou transcrições. Vou minerar as frases e o vocabulário exatos que eles usam.', patch: null }
  }
  const getBrand = deps.getDefaultBrand ?? getBrandImpl
  const getVoice = deps.getBrandVoice ?? getVoiceImpl
  const upsert = deps.upsertBrandVoice ?? upsertVoiceImpl
  const espelhar = deps.espelhar ?? espelharVozNoCerebro
  const generate = deps.generate ?? defaultGenerate
  const recordCost = deps.recordCost ?? recordCostImpl
  const now = deps.now ?? (() => new Date().toISOString())
  const agentId = ctx.actingAgentId ?? 'copywriter'

  const brand = await getBrand(ctx.operatorId)
  if (!brand) return { output: 'Ainda não conheço a marca — vamos fazer a entrevista de marca primeiro?', patch: null }

  const prompt = `Você é copywriter minerando a VOZ REAL do público a partir do material cru colado (reviews/comentários/DMs/transcrições). Extraia SEM inventar (use [] quando não houver):
- frasesExatas: trechos VERBATIM do público (as palavras deles, sem parafrasear) — ex.: "eu odeio quando o suporte some".
- vocabulario: gírias/termos/jargão que eles usam.
- dores, desejos, objecoes: o que o material revela (frases curtas).

MATERIAL:
${materialCercado(material)}

Devolva: frasesExatas[], vocabulario[], dores[], desejos[], objecoes[].`

  const { object, usage, model } = await generate({ prompt })
  try { await recordCost({ kind: 'chat', model: model ?? MODEL, promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0, agent: agentId, tool: 'minerarVozDoPublico' }) } catch {  }

  const patch = toPatch(VozPublicoSchema.parse(object))
  const atual = await getVoice(ctx.operatorId, brand.id)
  
  const next = mergeBrandVoice(atual, patch, { origem: 'reflector', at: now() })
  await upsert(ctx.operatorId, brand.id, next)
  try { await espelhar({ slug: brand.slug, nomeMarca: brand.nome, voice: next }) } catch {  }

  const nFrases = next.dna.vozDoPublico?.frasesExatas?.length ?? 0
  const dnaPatch: EstudioPatch = { op: 'upsert', entidade: 'dna', voice: next }
  const output = `Minerei a voz do público: guardei ${nFrases} frase(s) verbatim e o vocabulário deles na Ficha. Agora escrevo falando a língua do teu cliente — sem inventar tom.`
  return { output, patch: dnaPatch }
}
