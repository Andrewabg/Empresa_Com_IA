import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

export interface EmbedClient { embed(texts: string[]): Promise<number[][]> }

export class OpenAIEmbedClient implements EmbedClient {
  constructor(private model: string) {}
  async embed(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({ model: openai.embedding(this.model), values: texts })
    return embeddings
  }
}

export class Embedder {
  constructor(private client: EmbedClient, private model: string, private dim = 1536) {}
  embedAll(texts: string[]) { return this.client.embed(texts) }
  version() { return `openai:${this.model}:${this.dim}` }
}
