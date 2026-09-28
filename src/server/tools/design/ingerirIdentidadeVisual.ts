
import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getSetting } from '@/data/settings'
import { ensureDefaultBrand as ensureBrandImpl } from '@/data/brands'
import {
  getBrandVoice as getBrandVoiceImpl,
  getDirecaoArte as getDirecaoArteImpl,
  upsertDirecaoArte as upsertDirecaoArteImpl,
} from '@/data/brandVoice'
import { renderBrandVoice } from '@/lib/estudio/brandVoice'
import { mergeDirecaoArte, type DirecaoArtePatch } from '@/lib/design/direcaoArte'
import { serverDb } from '@/server/supabase'
import { TOPICS, topicTag } from '@/server/interview/topics'
import { promptIngestaoVisual } from './prompts'
import type { EstudioPatch } from '@/lib/estudio/types'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


const DirecaoSchema = z.object({
  paleta: z.array(z.object({ nome: z.string(), hex: z.string() })),
  estiloFotografico: z.string(),
  iluminacao: z.string(),
  composicao: z.string(),
  mood: z.string(),
  proibicoes: z.array(z.string()),
  assinatura: z.string(),
})

interface GenUsage { inputTokens?: number; outputTokens?: number }

export interface IngerirIdentidadeVisualCtx { operatorId?: string; actingAgentId?: string }
export interface IngerirIdentidadeVisualDeps {
  getCompanyName?: () => Promise<string | null>
  ensureDefaultBrand?: typeof ensureBrandImpl
  getBrandVoice?: typeof getBrandVoiceImpl
  getDirecaoArte?: typeof getDirecaoArteImpl
  upsertDirecaoArte?: typeof upsertDirecaoArteImpl
  lerNotasEmpresa?: (operatorId: string) => Promise<string>
  generate?: (args: { prompt: string }) => Promise<{ object: unknown; usage: GenUsage }>
  recordCost?: typeof recordCostImpl
  now?: () => string
}
export interface IngerirIdentidadeVisualResult { output: string; patch: EstudioPatch | null }


async function defaultLerNotas(_operatorId: string): Promise<string> {
  const tags = TOPICS.map((t) => topicTag(t.id))
  const { data, error } = await serverDb()
    .from('notes')
    .select('title, tags, note_chunks(content, chunk_index)')
    .overlaps('tags', tags)
  if (error) { console.warn('[ingerirIdentidadeVisual] lerNotas:', error.message); return '' }
  type Row = { title?: string; note_chunks?: { content: string; chunk_index: number }[] }
  return (data as Row[] ?? [])
    .map((n) => {
      const corpo = (n.note_chunks ?? []).sort((a, b) => a.chunk_index - b.chunk_index).map((c) => c.content).join('\n')
      return `## ${n.title ?? ''}\n${corpo}`
    })
    .join('\n\n').trim()
}

async function defaultGenerate({ prompt }: { prompt: string }): Promise<{ object: unknown; usage: GenUsage }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({ model: openai(MODEL), schema: DirecaoSchema, prompt })
  return { object, usage }
}

function toDirecaoPatch(o: z.infer<typeof DirecaoSchema>): DirecaoArtePatch {
  return {
    paleta: o.paleta,
    estiloFotografico: o.estiloFotografico || undefined,
    iluminacao: o.iluminacao || undefined,
    composicao: o.composicao || undefined,
    mood: o.mood || undefined,
    proibicoes: o.proibicoes,
    assinatura: o.assinatura || undefined,
  }
}

export async function ingerirIdentidadeVisual(
  _input: Record<string, never>,
  ctx: IngerirIdentidadeVisualCtx,
  deps: IngerirIdentidadeVisualDeps = {},
): Promise<IngerirIdentidadeVisualResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }

  const getCompanyName = deps.getCompanyName ?? (() => getSetting('company_name'))
  const ensureBrand = deps.ensureDefaultBrand ?? ensureBrandImpl
  const getVoice = deps.getBrandVoice ?? getBrandVoiceImpl
  const getDir = deps.getDirecaoArte ?? getDirecaoArteImpl
  const upsert = deps.upsertDirecaoArte ?? upsertDirecaoArteImpl
  const lerNotas = deps.lerNotasEmpresa ?? defaultLerNotas
  const generate = deps.generate ?? defaultGenerate
  const recordCost = deps.recordCost ?? recordCostImpl
  const now = deps.now ?? (() => new Date().toISOString())
  const agentId = ctx.actingAgentId ?? 'designer'

  const nome = (await getCompanyName())?.trim() || 'Minha marca'
  const brand = await ensureBrand(ctx.operatorId, nome)

  const notas = await lerNotas(ctx.operatorId)
  const voice = await getVoice(ctx.operatorId, brand.id)
  const dnaVerbal = renderBrandVoice(voice)

  if (!notas && !dnaVerbal) {
    return {
      output: `Ainda não achei muito sobre a ${nome}... me conta em uma frase como a marca deve PARECER — cores, clima, estilo de foto?`,
      patch: null,
    }
  }

  const prompt = promptIngestaoVisual({ notas, dnaVerbal })
  const { object, usage } = await generate({ prompt })
  try {
    await recordCost({
      kind: 'chat', model: MODEL,
      promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0,
      agent: agentId, tool: 'ingerirIdentidadeVisual',
    })
  } catch {  }

  const patch = toDirecaoPatch(DirecaoSchema.parse(object))
  const atual = await getDir(ctx.operatorId, brand.id)
  const next = mergeDirecaoArte(atual, patch, { origem: 'entrevista', at: now() })
  await upsert(ctx.operatorId, brand.id, next)

  const direcaoPatch: EstudioPatch = { op: 'upsert', entidade: 'direcao', direcao: next }
  const resumo = next.estiloFotografico ?? next.mood ?? 'visual com identidade própria'
  const output = `Dei uma boa olhada na ${nome}. A direção que captei: ${resumo}. Atualizei a direção de arte — a cara da marca é essa?`
  return { output, patch: direcaoPatch }
}
