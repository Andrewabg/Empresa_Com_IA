




import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { recordCost } from '@/data/cost'
import { assertEmbeddingDim, knownEmbeddingDim, SCHEMA_EMBEDDING_DIM } from '@/lib/embedding-dims'

interface EmbeddingsResponse {
  data?: { embedding: number[] }[]
  usage?: { prompt_tokens?: number }
}


export function embeddingModelCanais(): string {
  return process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'
}


export function embeddingVersionCanais(): string {
  const model = embeddingModelCanais()
  const dim = knownEmbeddingDim(model) ?? SCHEMA_EMBEDDING_DIM
  return `openai:${model}:${dim}`
}


export async function embedTexto(texto: string, fetchImpl: typeof fetch = fetch, agentId?: string): Promise<number[]> {
  const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'
  
  
  assertEmbeddingDim(model)
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new Error('embedTexto: openai_api_key ausente no Vault')

  const res = await fetchImpl('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: texto }),
  })
  
  if (!res.ok) throw new Error(`embedTexto: OpenAI HTTP ${res.status}`)

  const json = (await res.json()) as EmbeddingsResponse
  const embedding = json.data?.[0]?.embedding
  if (!embedding) throw new Error('embedTexto: resposta da OpenAI sem embedding')

  
  await recordCost({
    kind: 'embedding',
    model,
    promptTokens: json.usage?.prompt_tokens ?? 0,
    completionTokens: 0,
    agent: agentId,
  })
  return embedding
}
