
import { z } from 'zod'
import { getConversationForReflect, setConversationTitle } from '../../data/messages'
import { recordCost as recordCostImpl } from '@/data/cost'
import { generateBackgroundObject, type BgGenResult } from '../cost/backgroundLLM'
import { BACKGROUND_MAX_OUTPUT } from '@/lib/llm-tuning'

const TituloSchema = z.object({ title: z.string() })


export function buildTituloPrompt(primeiroTexto: string): string {
  return `Gere um titulo curto (ate 6 palavras, pt-BR) que nomeia o ASSUNTO desta mensagem, estilo aba de navegador (ex.: "ROAS do cliente X", "Contrato de prestacao"). Sem aspas, sem ponto final, sem prefixo. Mensagem:\n${primeiroTexto}`
}

export interface TituloThreadDeps {
  generate?: (args: { prompt: string }) => Promise<BgGenResult>
  recordCost?: typeof recordCostImpl
}


export async function gerarTituloThread(
  conversationId: string,
  primeiroTexto: string,
  deps: TituloThreadDeps = {},
): Promise<void> {
  try {
    const texto = (primeiroTexto ?? '').trim()
    if (!texto) return
    const conv = await getConversationForReflect(conversationId)
    if (!conv) return
    
    if (!conv.title_provisional && conv.title) return
    const generate =
      deps.generate ??
      ((args: { prompt: string }) =>
        generateBackgroundObject({
          schema: TituloSchema,
          prompt: args.prompt,
          maxOutputTokens: BACKGROUND_MAX_OUTPUT,
        }))
    const recordCost = deps.recordCost ?? recordCostImpl
    const raw = await generate({ prompt: buildTituloPrompt(texto) })
    try {
      await recordCost({
        kind: 'chat',
        model: raw.model,
        promptTokens: raw.usage.inputTokens ?? 0,
        completionTokens: raw.usage.outputTokens ?? 0,
        cachedTokens: raw.usage.cachedInputTokens ?? 0,
        agent: 'jarvis',
        tool: 'gerarTituloThread',
      })
    } catch {  }
    const parsed = TituloSchema.parse(raw.object)
    const t = parsed.title?.trim()
    if (!t) return
    
    const atual = await getConversationForReflect(conversationId)
    if (atual && (atual.title_provisional || !atual.title)) {
      await setConversationTitle(conversationId, t.slice(0, 120))
    }
  } catch (e) {
    console.warn('[gerarTituloThread] fail-open:', e)
  }
}
