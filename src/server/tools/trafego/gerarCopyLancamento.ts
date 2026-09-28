


import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getDefaultBrand as getDefaultBrandImpl } from '@/data/brands'
import { getBrandVoice as getBrandVoiceImpl } from '@/data/brandVoice'
import { lerGroundingDoCriativo as lerGroundingDoCriativoImpl, type GroundingCriativo } from '@/data/pecas'
import { EMPTY_BRAND_VOICE } from '@/lib/estudio/brandVoice'
import { renderBrandVoice } from '@/lib/estudio/brandVoice'
import { CTAS_VALIDOS } from '@/lib/trafego/lancamentoCriativo'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'

interface GenUsage { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number }

export interface CopyLancamento { message: string; headline: string; ctaMeta: string; porque: string }
export interface GerarCopyLancamentoInput { artifactId: string; link: string; brandId?: string }
export interface GerarCopyLancamentoCtx { operatorId: string; actingAgentId?: string }
export interface GerarCopyLancamentoDeps {
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage; model?: string }>
  getBrandVoice?: typeof getBrandVoiceImpl
  getDefaultBrand?: typeof getDefaultBrandImpl
  lerGroundingDoCriativo?: typeof lerGroundingDoCriativoImpl
  recordCost?: typeof recordCostImpl
}


const CTAS_LISTA = [...CTAS_VALIDOS]


export function promptCopyLancamento(args: {
  vozRender: string
  grounding: GroundingCriativo | null
  link: string
}): string {
  const { vozRender, grounding, link } = args
  const g = grounding ?? {}
  const blocoCriativo = (g.conceito || g.headline || g.subheadline)
    ? `\n\nCRIATIVO (a arte do designer que este anúncio vai levar — honre o conceito visual):\n` +
      [
        g.conceito ? `Conceito: ${g.conceito}` : '',
        g.headline ? `Headline da arte: ${g.headline}` : '',
        g.subheadline ? `Subheadline da arte: ${g.subheadline}` : '',
        g.formato ? `Formato: ${g.formato}` : '',
      ].filter(Boolean).join('\n')
    : '\n\n(sem grounding do criativo — escreva a partir da marca e do destino)'
  return `Você é o melhor copywriter de resposta direta do Brasil. Você escreve anúncios que VENDEM:
ganchos que param o scroll, promessa clara, e um CTA que faz a pessoa clicar. Escreva a copy de UM
anúncio do Meta (Facebook/Instagram) pronto pra subir.

VOZ DA MARCA E APRENDIZADOS (honre à risca):
${vozRender || '(voz ainda não definida — use tom profissional neutro)'}${blocoCriativo}

DESTINO (pra onde o clique leva): ${link}

REGRA DURA (anti-invenção): use SOMENTE provas reais da voz da marca acima. Se precisar de um
dado/prova que não está ali, escreva um placeholder entre colchetes [PROVA: descreva o que falta] —
NUNCA invente número, depoimento ou fato.

Devolva JSON com:
- "message": o texto primário do anúncio (1 a 3 frases curtas, direto ao ponto, sem enrolação).
- "headline": o gancho curto renderizado no card do anúncio (no máximo 40 caracteres).
- "ctaMeta": o MELHOR botão de CTA do Meta que converte para ESTA oferta/destino — escolha UM da lista
  exata: ${CTAS_LISTA.join(', ')}.
- "porque": 1 linha explicando por que essa copy + esse CTA convertem para este público/oferta.

PT-BR.`
}


async function defaultGenerate({ prompt, schema }: { prompt: string; schema: z.ZodType<unknown> }): Promise<{ object: unknown; usage: GenUsage; model: string }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({ model: openai(MODEL), schema, prompt })
  return { object, usage, model: MODEL }
}


function parse<T>(object: unknown, schema: z.ZodType<T>): T | null {
  const r = schema.safeParse(object)
  return r.success ? r.data : null
}

const CopySchema = z.object({
  message: z.string(),
  headline: z.string(),
  ctaMeta: z.enum(CTAS_LISTA as [string, ...string[]]),
  porque: z.string(),
})


export async function gerarCopyLancamento(
  input: GerarCopyLancamentoInput,
  ctx: GerarCopyLancamentoCtx,
  deps: GerarCopyLancamentoDeps = {},
): Promise<CopyLancamento> {
  const generate = deps.generate ?? defaultGenerate
  const getBrandVoice = deps.getBrandVoice ?? getBrandVoiceImpl
  const getDefaultBrand = deps.getDefaultBrand ?? getDefaultBrandImpl
  const lerGrounding = deps.lerGroundingDoCriativo ?? lerGroundingDoCriativoImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const agent = ctx.actingAgentId ?? 'gestor-trafego'

  
  const brandId = input.brandId ?? (await getDefaultBrand(ctx.operatorId).catch(() => null))?.id
  let voice = EMPTY_BRAND_VOICE
  if (brandId) {
    voice = await getBrandVoice(ctx.operatorId, brandId).catch(() => EMPTY_BRAND_VOICE)
  }
  const vozRender = renderBrandVoice(voice, 'meta')

  
  const grounding = await lerGrounding(input.artifactId).catch(() => null)

  const prompt = promptCopyLancamento({ vozRender, grounding, link: input.link })
  const { object, usage, model } = await generate({ prompt, schema: CopySchema })

  
  try {
    await recordCost({
      kind: 'chat', model: model ?? MODEL,
      promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0,
      cachedTokens: usage.cachedInputTokens ?? 0,
      agent, tool: 'gerarCopyLancamento',
    })
  } catch {  }

  const copy = parse(object, CopySchema)
  if (!copy) throw new Error('gerarCopyLancamento: a copy gerada não casou o schema')
  return copy
}
