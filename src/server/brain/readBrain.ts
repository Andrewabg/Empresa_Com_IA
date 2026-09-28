
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serverDb } from '../supabase'
import { getSecret as getSecretDefault, SECRET_KEYS } from '../secrets'
import { Embedder } from '../../brain/embeddings'
import type { BrainRepo } from '../../brain/repo'
import { ResilientBrainRepo } from './resilientRepo'
import type { Search } from '../../brain/search'
import { SearchComPiso } from './searchComPiso'
import { CostAwareEmbedClient } from '../cost/embedClient'
import { MemoEmbedClient } from './memoEmbedClient'
import { cloneDir } from './skillsPaths'
import { assertEmbeddingDim } from '@/lib/embedding-dims'
import { NotConfiguredError } from './runtime'

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'


export interface ReadBrain {
  db: SupabaseClient
  search: Search
  embedder: Embedder
  repo: BrainRepo | null
}


export function resolveLocalRepo(dir: string, exists: (p: string) => boolean = existsSync): BrainRepo | null {
  return exists(join(dir, '.git')) ? new ResilientBrainRepo(dir) : null
}

export interface ReadBrainDeps {
  getSecret?: (k: string) => Promise<string | null>
}

export async function getReadBrain(deps: ReadBrainDeps = {}): Promise<ReadBrain> {
  const getSecret = deps.getSecret ?? getSecretDefault
  const openaiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!openaiKey) throw new NotConfiguredError(['openai_api_key'])
  
  process.env.OPENAI_API_KEY = openaiKey
  assertEmbeddingDim(EMBEDDING_MODEL)
  const db = serverDb()
  const embedder = new Embedder(new MemoEmbedClient(new CostAwareEmbedClient(EMBEDDING_MODEL)), EMBEDDING_MODEL)
  const search = new SearchComPiso(db, embedder)
  
  const repo = resolveLocalRepo(cloneDir())
  return { db, search, embedder, repo }
}
