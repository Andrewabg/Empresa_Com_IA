


import { z } from 'zod'
import { generateBackgroundObject } from '@/server/cost/backgroundLLM'
import { recordCost } from '@/data/cost'

const Veredito = z.object({
  passou: z.boolean(),
  porque: z.string(),
})

const PROMPT = (criterio: string, resposta: string) =>
  `Você é um juiz de qualidade de atendimento. CRITÉRIO que a resposta deve cumprir:\n"${criterio}"\n\nRESPOSTA do atendente:\n"${resposta}"\n\nA resposta cumpre o critério? Responda passou=true/false e um porquê curto. Seja tolerante a variação de frase; foque no CONTEÚDO.`

async function julgar1(
  criterio: string,
  resposta: string,
  agentId: string,
): Promise<{ passou: boolean; porque: string }> {
  const raw = await generateBackgroundObject({ schema: Veredito, prompt: PROMPT(criterio, resposta) })
  
  
  await recordCost({
    kind: 'chat',
    model: raw.model,
    promptTokens: raw.usage.inputTokens ?? 0,
    completionTokens: raw.usage.outputTokens ?? 0,
    cachedTokens: raw.usage.cachedInputTokens ?? 0,
    agent: agentId,
    tool: 'treinoJuiz',
  })
  return Veredito.parse(raw.object)
}


export async function julgarCaso(
  criterio: string,
  resposta: string,
  agentId: string,
  deps: {
    julgar?: (
      c: string,
      r: string,
      a: string,
    ) => Promise<{ passou: boolean; porque: string }>
  } = {},
): Promise<{ passou: boolean; porque: string; estavel: boolean }> {
  const j = deps.julgar ?? julgar1
  const [primeiro, segundo] = await Promise.all([
    j(criterio, resposta, agentId),
    j(criterio, resposta, agentId),
  ])
  const estavel = primeiro.passou === segundo.passou
  return {
    passou: primeiro.passou && segundo.passou,
    porque: primeiro.porque,
    estavel,
  }
}
