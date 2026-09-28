
import { z } from 'zod'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { recordCost as recordCostImpl } from '@/data/cost'
import type { LaudoDoTexto, TextoPedido } from '@/lib/design/conferenciaDoTexto'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'

const LaudoSchema = z.object({
  headlineExata: z.boolean(),
  headlineLida: z.string(),
  apoioExato: z.boolean(),
  quebraRespeitada: z.boolean(),
  ctaExato: z.boolean(),
  inventouTexto: z.boolean(),
  oQueInventou: z.string(),
})


function campo(rotulo: string, texto: string | undefined): string {
  return texto?.trim() ? `\n${rotulo}:\n${texto}\n` : ''
}

export function promptDaConferencia(pedido: TextoPedido): string {
  const linhas = (pedido.headline ?? '').split('\n').length
  return `Esta é uma arte de anúncio pronta. O texto abaixo é o que ela DEVERIA mostrar, exatamente assim, com os mesmos acentos e a mesma pontuação.
${campo(`HEADLINE (em ${linhas} linha(s), quebrando exatamente onde está quebrado aqui)`, pedido.headline)}${campo('LINHA DE APOIO', pedido.subheadline)}${campo('CHAMADA', pedido.cta)}
Leia o texto que aparece na imagem letra por letra antes de responder. Julgue o que a imagem MOSTRA, não o que ela quase mostra.

- headlineExata: a headline aparece escrita EXATAMENTE assim, palavra por palavra, acento por acento? false se faltar acento, se uma letra estiver errada, se uma palavra estiver trocada, truncada ou embolada, ou se ela não aparecer. Se nenhuma headline foi pedida acima, responda true.
- headlineLida: transcreva LITERALMENTE a headline como você a lê, inclusive erros. Use " / " para a quebra de linha. Vazio se não houver.
- apoioExato: a linha de apoio aparece exatamente como acima? true se nenhuma foi pedida.
- quebraRespeitada: a headline está quebrada nas MESMAS ${linhas} linha(s), no mesmo ponto da frase? true se nenhuma foi pedida.
- ctaExato: a chamada aparece exatamente como acima? true se nenhuma foi pedida.
- inventouTexto: apareceu texto de VENDA que não estava na lista acima (rótulo, botão extra, marca, legenda)? O texto que faz parte de um objeto fotografado (papel, tela, recibo, formulário) NÃO conta como invenção: ele é a cena.
- oQueInventou: transcreva o que apareceu a mais. Vazio se nada.`
}

export interface ConferirDeps {
  avaliar?: (args: { prompt: string; bytes: Uint8Array }) => Promise<{ object: unknown; usage: { inputTokens?: number; outputTokens?: number } } | null>
  recordCost?: typeof recordCostImpl
}

async function defaultAvaliar(args: { prompt: string; bytes: Uint8Array }) {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) return null
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({
    model: openai(MODEL),
    schema: LaudoSchema,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: args.prompt },
        { type: 'image', image: args.bytes, mediaType: 'image/png' },
      ],
    }],
  })
  return { object, usage }
}


export async function conferirTextoDaArte(
  bytes: Uint8Array,
  pedido: TextoPedido,
  ctx: { agentId: string },
  deps: ConferirDeps = {},
): Promise<LaudoDoTexto | null> {
  
  if (!pedido.headline?.trim() && !pedido.subheadline?.trim() && !pedido.cta?.trim()) return null
  const avaliar = deps.avaliar ?? defaultAvaliar
  const recordCost = deps.recordCost ?? recordCostImpl
  try {
    const r = await avaliar({ prompt: promptDaConferencia(pedido), bytes })
    if (!r) return null
    try {
      await recordCost({
        kind: 'chat', model: MODEL,
        promptTokens: r.usage.inputTokens ?? 0, completionTokens: r.usage.outputTokens ?? 0,
        agent: ctx.agentId, tool: 'conferirTextoDaArte',
      })
    } catch {  }
    const parsed = LaudoSchema.safeParse(r.object)
    return parsed.success ? parsed.data : null
  } catch (e) {
    console.warn('[conferirTextoDaArte] fail-open:', e)
    return null
  }
}
