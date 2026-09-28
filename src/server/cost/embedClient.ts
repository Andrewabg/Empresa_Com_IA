
import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { EmbedClient } from '@/brain/embeddings'
import { recordCost } from '@/data/cost'

export class CostAwareEmbedClient implements EmbedClient {
  constructor(private model: string) {}

  async embed(texts: string[]): Promise<number[][]> {
    const { embeddings, usage } = await embedMany({
      model: openai.embedding(this.model),
      values: texts,
    })
    try {
      await recordCost({
        kind: 'embedding',
        model: this.model,
        promptTokens: usage?.tokens ?? 0,
        completionTokens: 0,
      })
    } catch (err) {
      console.warn('[CostAwareEmbedClient] recordCost falhou (não fatal):', err)
    }
    return embeddings
  }
}
