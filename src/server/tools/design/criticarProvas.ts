
import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { recordCost as recordCostImpl } from '@/data/cost'
import { AI_TELLS } from '@/lib/design/realismo'
import type { AvaliacaoProva } from '@/lib/design/criticaVisual'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'

const AvaliacaoSchema = z.object({
  indice: z.number(),
  nota: z.number(),
  textoLegivel: z.boolean(),
  caraDeIa: z.boolean(),
  textoCortado: z.boolean(),
  
  
  cenaConfere: z.boolean(),
  problemas: z.array(z.string()),
  
  
  
  evidencia: z.string(),
})
export const CriticaVisualSchema = z.object({ avaliacoes: z.array(AvaliacaoSchema) })

export interface ProvaParaCriticar {
  indice: number
  conceito: string
  artifactId: string
  headline?: string
  cta?: string
  
  cenaEsperada?: string
}

interface GenUsage { inputTokens?: number; outputTokens?: number }

export interface CriticarProvasDeps {
  baixar?: (artifactId: string) => Promise<Buffer | null>
  avaliar?: (args: {
    prompt: string; imagens: { bytes: Uint8Array; rotulo: string }[]
  }) => Promise<{ object: unknown; usage: GenUsage } | null>
  recordCost?: typeof recordCostImpl
}

function buildPrompt(provas: ProvaParaCriticar[]): string {
  const lista = provas.map((p) => {
    const esperado = [p.headline ? `headline "${p.headline}"` : '', p.cta ? `CTA "${p.cta}"` : '']
      .filter(Boolean).join(' e ')
    const cena = p.cenaEsperada?.trim() ? `\n  A CENA deveria ser: ${p.cenaEsperada.trim()}` : ''
    return `- Prova ${p.indice} ("${p.conceito}")${esperado ? ` — deveria mostrar ${esperado}` : ''}${cena}`
  }).join('\n')

  return `Você é um diretor de arte sênior de resposta direta fazendo o CONTROLE DE QUALIDADE de anúncios
que acabaram de ser renderizados. As imagens vêm na ordem abaixo, uma por prova.

${lista}

Cada critério abaixo é uma pergunta de SIM ou NÃO. Não existe "mais ou menos": responda o que a
imagem mostra, não o que ela quase mostra. E antes de responder qualquer um deles, LEIA em voz alta
o texto que aparece na imagem e compare palavra a palavra com o esperado.

Para CADA imagem, avalie com rigor de quem vai gastar dinheiro de mídia nela:
- textoLegivel: o texto renderizado na imagem está NÍTIDO, com palavras reais e escritas corretamente?
  Marque false se houver letra embolada, palavra inventada/truncada, sobreposição ilegível ou se a
  headline esperada não aparecer. ATENÇÃO: o texto que faz parte do OBJETO fotografado (as linhas de
  um papel impresso, os balões de uma conversa na tela, os itens de um recibo) NÃO é o texto do
  anúncio. Ele não entra aqui, não entra em textoCortado e NÃO é defeito — é a cena.
- textoCortado: algum texto encosta na borda, sai do quadro ou cai onde a interface do placement
  cobriria (topo/rodapé de story)?
- cenaConfere: a imagem É a cena descrita em "A CENA deveria ser"? Marque false se o objeto pedido
  não aparecer, se virou outra coisa, ou se o texto que faz parte do objeto estiver embolado a ponto
  de não parecer escrita de verdade. Se a prova não declarar cena esperada, devolva true.
- caraDeIa: a imagem denuncia ter sido gerada? Denúncias: ${AI_TELLS.join('; ')}.
  Anúncio puramente gráfico/tipográfico NÃO conta como cara de IA — só marque true se a cena
  fotográfica trair geração automática.
- nota: 0 a 10 pra força do anúncio (impacto do gancho, hierarquia, contraste, quanto para o dedo).
- problemas: lista curta e específica do que está errado NESTA imagem (PT-BR). [] se nada.
- evidencia: o que você VIU e que sustenta o veredito, em uma frase, CITANDO entre aspas o texto que
  leu na imagem quando o problema for de texto (ex.: li "PARE DE PERDR" no lugar de "PARE DE PERDER").
  Sem citação, um veredito de texto não vale. Devolva "" só quando não houver nada a apontar.

Seja honesto e severo: um anúncio com texto embolado não pode receber nota alta. Julgue cada imagem
POR ELA MESMA, sem comparar com as outras: a mesma imagem tem que receber o mesmo veredito se a
ordem da lista for invertida. Devolva uma avaliação por prova, com o campo indice batendo com o
número da prova acima.`
}

async function defaultAvaliar(args: {
  prompt: string; imagens: { bytes: Uint8Array; rotulo: string }[]
}): Promise<{ object: unknown; usage: GenUsage } | null> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) return null
  const openai = createOpenAI({ apiKey })
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: Uint8Array; mediaType: string }
  > = [{ type: 'text', text: args.prompt }]
  for (const img of args.imagens) {
    content.push({ type: 'text', text: img.rotulo })
    content.push({ type: 'image', image: img.bytes, mediaType: 'image/png' })
  }
  const { object, usage } = await generateObject({
    model: openai(MODEL),
    schema: CriticaVisualSchema,
    messages: [{ role: 'user', content }],
  })
  return { object, usage }
}


export async function criticarProvas(
  provas: ProvaParaCriticar[],
  ctx: { agentId: string },
  deps: CriticarProvasDeps = {},
): Promise<AvaliacaoProva[] | null> {
  if (!provas.length) return null
  const baixar = deps.baixar
  const avaliar = deps.avaliar ?? defaultAvaliar
  const recordCost = deps.recordCost ?? recordCostImpl
  if (!baixar) return null

  try {
    const baixadas = await Promise.all(provas.map(async (p) => {
      try {
        const bytes = await baixar(p.artifactId)
        return bytes ? { prova: p, bytes } : null
      } catch { return null }
    }))
    const legiveis = baixadas.filter((b): b is { prova: ProvaParaCriticar; bytes: Buffer } => b !== null)
    if (!legiveis.length) return null

    const res = await avaliar({
      prompt: buildPrompt(legiveis.map((l) => l.prova)),
      imagens: legiveis.map((l) => ({ bytes: new Uint8Array(l.bytes), rotulo: `Prova ${l.prova.indice}:` })),
    })
    if (!res) return null

    try {
      await recordCost({
        kind: 'chat', model: MODEL,
        promptTokens: res.usage.inputTokens ?? 0, completionTokens: res.usage.outputTokens ?? 0,
        agent: ctx.agentId, tool: 'criticarProvas',
      })
    } catch {  }

    const parsed = CriticaVisualSchema.safeParse(res.object)
    if (!parsed.success) return null
    return parsed.data.avaliacoes
  } catch (e) {
    console.warn('[criticarProvas] fail-open:', e instanceof Error ? e.message : e)
    return null
  }
}
