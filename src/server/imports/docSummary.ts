
import { z } from 'zod'
import { generateBackgroundObject, type BgUsage } from '@/server/cost/backgroundLLM'
import { recordCost } from '@/data/cost'


export const DOC_SUMMARY_SOURCE_CHARS = 8000

export const DOC_SUMMARY_MAX_CHARS = 600

const DOC_SUMMARY_MAX_OUTPUT = 400

export interface DocSummaryDeps {
  gen?: (args: { schema: unknown; prompt: string; maxOutputTokens?: number; reasoningEffort?: string }) => Promise<{ object: unknown; usage: BgUsage; model: string }>
  record?: typeof recordCost
}



const DocSummarySchema = z.object({
  resumo: z.string(),
  secoes: z.array(z.string()),
})


export function buildDocSummaryPrompt(head: string, filename: string, context?: string): string {
  const lente = context?.trim()
    ? `\nO dono destacou: "${context.trim()}". Situe o resumo em torno disso quando aplicável.\n`
    : ''
  return `Você resume um documento empresarial para SITUAR um extrator de fatos que vai ler o documento em pedaços isolados. Analise o início do arquivo "${filename}" abaixo e produza:
- "resumo": 1 a 2 frases dizendo do que trata o documento (assunto, empresa/produto/tema central) — o suficiente para resolver referências como "esse plano", "a empresa", "o valor disso".
- "secoes": um esboço curto das principais seções/tópicos presentes (poucas entradas).

NÃO invente: baseie-se só no texto abaixo. Se algo não aparece, omita.
${lente}
Início do documento:
---
${head}
---`
}


function montarSummary(resumo: string, secoes: string[]): string {
  const r = (resumo ?? '').trim()
  const s = (secoes ?? []).map(x => x.trim()).filter(Boolean)
  const partes = [r]
  if (s.length) partes.push(`Seções: ${s.join(', ')}.`)
  const full = partes.filter(Boolean).join(' ').trim()
  return full.length > DOC_SUMMARY_MAX_CHARS ? full.slice(0, DOC_SUMMARY_MAX_CHARS) : full
}


export async function gerarDocSummary(
  text: string,
  ctx: { filename: string; context?: string },
  deps?: DocSummaryDeps,
): Promise<string | null> {
  if (!text?.trim()) return null
  const gen = deps?.gen ?? generateBackgroundObject
  const record = deps?.record ?? recordCost

  const head = text.slice(0, DOC_SUMMARY_SOURCE_CHARS)
  const prompt = buildDocSummaryPrompt(head, ctx.filename, ctx.context)

  try {
    const r = await gen({
      schema: DocSummarySchema,
      prompt,
      maxOutputTokens: DOC_SUMMARY_MAX_OUTPUT,
      reasoningEffort: 'minimal', 
    })

    
    await record({
      kind: 'curator',
      model: r.model,
      promptTokens: r.usage.inputTokens ?? 0,
      completionTokens: r.usage.outputTokens ?? 0,
      cachedTokens: r.usage.cachedInputTokens ?? 0,
      agent: 'curador',
      tool: 'docSummary',
    }).catch(() => {})

    const parsed = DocSummarySchema.safeParse(r.object)
    if (!parsed.success) return null
    const summary = montarSummary(parsed.data.resumo, parsed.data.secoes)
    return summary.length ? summary : null
  } catch {
    
    return null
  }
}
