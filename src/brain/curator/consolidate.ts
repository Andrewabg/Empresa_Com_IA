import { z } from 'zod'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { MemoryCandidate } from '../../db/types'

export const DecisionSchema = z.object({
  action: z.enum(['ignore', 'create', 'merge']),
  noteId: z.string().optional(),
  path: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  reason: z.string(),
})

export type Decision = z.infer<typeof DecisionSchema>

export interface DecideClient {
  decide(prompt: string): Promise<Decision>
}

export class OpenAIDecideClient implements DecideClient {
  constructor(private model = 'gpt-4.1') {}

  async decide(prompt: string): Promise<Decision> {
    const { object } = await generateObject({
      model: openai(this.model),
      schema: DecisionSchema,
      prompt,
    })
    return object
  }
}

export async function consolidate(
  input: {
    candidate: MemoryCandidate
    related: { id: string; path: string; body: string }[]
  },
  llm: DecideClient,
): Promise<Decision> {
  const prompt = [
    'Você é o Curador do Segundo Cérebro. Decida o que fazer com a memória candidata.',
    'Regras: ignore ruído/duplicata exata; merge se já existe nota relacionada; create se for inédito.',
    'Contradição: ao mesclar, vence a de maior confidence; empate -> a mais recente; explique no reason.',
    `Candidata: ${input.candidate.raw_content}`,
    `Notas relacionadas:\n${input.related.map(r => `- (${r.id}) ${r.path}: ${r.body.slice(0, 200)}`).join('\n') || '(nenhuma)'}`,
  ].join('\n\n')

  return llm.decide(prompt)
}
