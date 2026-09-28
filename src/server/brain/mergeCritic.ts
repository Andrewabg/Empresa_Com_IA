
import { z } from 'zod'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { recordCost } from '@/data/cost'
import type { Note } from '@/brain/note'
import { buildCriticPrompt } from '@/lib/brain-merge-prompt'
import { backgroundProviderOptions, BACKGROUND_MAX_OUTPUT } from '@/lib/llm-tuning'
import { withModelFallback, backgroundModels } from '@/server/cost/backgroundLLM'

export const MergeCriticSchema = z.object({
  lost_facts: z.array(z.string()),
  duplicated_entities: z.array(z.string()),
  placeholders: z.array(z.string()),
  contradictions: z.array(z.string()),
  verdict: z.enum(['clean', 'fixable', 'escalate']),
})
export type MergeCriticVerdict = z.infer<typeof MergeCriticSchema>

export interface MergeCriticInput {
  before: Note | null
  candidate: { raw_content: string }
  proposed: { body: string }
}
export interface MergeCritic {
  audit(i: MergeCriticInput): Promise<MergeCriticVerdict>
}


export class OpenAIMergeCritic implements MergeCritic {
  constructor(private model = 'gpt-5.1') {}

  async audit(i: MergeCriticInput): Promise<MergeCriticVerdict> {
    const prompt = buildCriticPrompt({ before: i.before?.body ?? '', candidate: i.candidate.raw_content, proposed: i.proposed.body })
    const cheap = backgroundModels().cheap
    const { object, usage, model } = await withModelFallback(cheap, this.model, async (m) => {
      const r = await generateObject({
        model: openai.chat(m),
        schema: MergeCriticSchema,
        prompt,
        maxOutputTokens: BACKGROUND_MAX_OUTPUT,
        providerOptions: { openai: { strictJsonSchema: false, ...(backgroundProviderOptions(m).openai ?? {}) } },
      })
      return { object: r.object, usage: r.usage }
    })
    try {
      await recordCost({
        kind: 'curator',
        model,
        promptTokens: usage?.inputTokens ?? 0,
        completionTokens: usage?.outputTokens ?? 0,
        cachedTokens: usage?.cachedInputTokens ?? 0,
        agent: 'merge-critic',
      })
    } catch (err) {
      console.warn('[OpenAIMergeCritic] recordCost falhou (não fatal):', err)
    }
    return object as MergeCriticVerdict
  }
}
