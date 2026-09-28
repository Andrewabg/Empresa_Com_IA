
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { DecisionSchema, type Decision, type DecideClient } from '@/brain/curator/consolidate'
import { recordCost } from '@/data/cost'
import { isReasoningModel } from '@/lib/llm-tuning'


const ESFORCO_DO_CURADOR = 'low'

export class CostAwareDecideClient implements DecideClient {
  constructor(private model: string) {}

  async decide(prompt: string): Promise<Decision> {
    
    
    
    
    
    
    
    const { object, usage } = await generateObject({
      model: openai.chat(this.model),
      schema: DecisionSchema,
      prompt,
      providerOptions: {
        openai: {
          strictJsonSchema: false,
          ...(isReasoningModel(this.model) ? { reasoningEffort: ESFORCO_DO_CURADOR } : {}),
        },
      },
    })
    try {
      await recordCost({
        kind: 'curator',
        model: this.model,
        promptTokens: usage?.inputTokens ?? 0,
        completionTokens: usage?.outputTokens ?? 0,
        cachedTokens: usage?.cachedInputTokens ?? 0,
        agent: 'curator-agent',
      })
    } catch (err) {
      console.warn('[CostAwareDecideClient] recordCost falhou (não fatal):', err)
    }
    return object
  }
}
