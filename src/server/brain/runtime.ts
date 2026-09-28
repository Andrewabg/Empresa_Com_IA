
import { join } from 'node:path'
import { existsSync, rmSync, readdirSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import simpleGit from 'simple-git'
import { Octokit } from '@octokit/rest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { serverDb } from '../supabase'
import { getSecret, SECRET_KEYS } from '../secrets'
import { Embedder } from '../../brain/embeddings'
import { EmbedderContextual } from './contextualEmbedder'
import { BrainRepo } from '../../brain/repo'
import { ResilientBrainRepo } from './resilientRepo'
import type { Search } from '../../brain/search'
import { SearchComPiso } from './searchComPiso'
import { Sync } from '../../brain/sync'
import type { Committer } from '../../brain/curator/commit'
import { CommitterTituloSeguro } from './committerTituloSeguro'
import { CostAwareEmbedClient } from '../cost/embedClient'
import { MemoEmbedClient } from './memoEmbedClient'
import { CostAwareDecideClient } from '../cost/decideClient'
import { NoteWriter } from './noteWriter'
import { OpenAIMergeCritic } from './mergeCritic'
import { FidelityCurator } from './fidelityCurator'
import { cloneDir } from './skillsPaths'
import { cloneUrl } from './cloneUrl'
import { curarRebaseTravado } from './rebaseTravado'
import { curarArvoreSuja } from './arvoreSuja'
import {
  mensagemDoCerebroInacessivel,
  motivoDoCerebroInacessivel,
  type MotivoDoCerebroInacessivel,
} from '@/lib/cerebro/inacessivel'
import { mesmoRepositorio } from './slugDoRemote'
import { assertEmbeddingDim } from '@/lib/embedding-dims'
import { withTimeout } from '@/lib/withTimeout'



process.env.GIT_TERMINAL_PROMPT = '0'

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
const BRANCH = process.env.BRAIN_BRANCH ?? 'main'




export const GIT_IDLE_TIMEOUT_MS = Number(process.env.BRAIN_GIT_IDLE_TIMEOUT_MS) || 20_000



const BUILD_TIMEOUT_MS = Number(process.env.BRAIN_BUILD_TIMEOUT_MS) || 90_000



const FAILED_BUILD_COOLDOWN_MS = Number(process.env.BRAIN_BUILD_COOLDOWN_MS) || 30_000


export class NotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Cérebro não configurado: faltam ${missing.join(', ')} no Vault. Configure em /config.`)
    this.name = 'NotConfiguredError'
  }
}


export class BrainUnreachableError extends Error {
  
  readonly motivo: MotivoDoCerebroInacessivel

  constructor(cause?: unknown) {
    
    
    
    
    super(mensagemDoCerebroInacessivel(cause))
    this.motivo = motivoDoCerebroInacessivel(cause)
    this.name = 'BrainUnreachableError'
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause
  }
}

export interface Brain {
  db: SupabaseClient
  repo: BrainRepo
  search: Search
  committer: Committer
  curator: FidelityCurator
  sync: Sync
  embedder: Embedder
  octokit: Octokit
  repoSlug: string
}


let _cache: { key: string; brain: Promise<Brain> } | null = null


let _failed: { key: string; at: number } | null = null




async function ensureRepo(repoSlug: string, token: string): Promise<BrainRepo> {
  const dir = cloneDir()
  const url = cloneUrl(repoSlug, token)
  const timeout = { block: GIT_IDLE_TIMEOUT_MS }
  if (existsSync(join(dir, '.git'))) {
    const git = simpleGit(dir, { timeout })
    
    
    await git.addConfig('core.autocrlf', 'false')

    
    
    
    
    
    
    
    
    
    
    
    
    const curaDoRebase = await curarRebaseTravado(dir, GIT_IDLE_TIMEOUT_MS)

    
    
    
    
    
    
    
    
    
    
    const curaDaArvore = await curarArvoreSuja(dir, GIT_IDLE_TIMEOUT_MS)

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    let precisaReclonar = curaDoRebase === 'reclonar' || curaDaArvore === 'reclonar'
    try {
      const remotes = await git.getRemotes(true)
      const origin = remotes.find((r) => r.name === 'origin')?.refs?.fetch ?? ''
      
      
      if (!mesmoRepositorio(origin, repoSlug)) precisaReclonar = true
    } catch (err) {
      
      console.warn('[ensureRepo] não deu pra conferir o origin (seguindo com o clone existente):', err)
    }

    if (precisaReclonar) {
      
      
      
      const motivo = curaDoRebase === 'reclonar'
        ? 'o rebase travado não pôde ser abortado'
        : curaDaArvore === 'reclonar'
          ? 'a mudança não commitada não pôde ser descartada'
          : 'o clone local é de outro repositório'
      console.warn(`[ensureRepo] ${motivo}; refazendo o clone de ${repoSlug}`)
      for (const entry of readdirSync(dir)) rmSync(join(dir, entry), { recursive: true, force: true })
      await simpleGit({ timeout }).clone(url, dir, ['--branch', BRANCH])
      await simpleGit(dir, { timeout }).addConfig('core.autocrlf', 'false')
      return new ResilientBrainRepo(dir)
    }

    
    
    
    
    
    
    
    
    await git.remote(['set-url', 'origin', url])
    const repo = new ResilientBrainRepo(dir)
    await repo.pull()
    return repo
  }
  
  
  
  
  
  
  
  if (existsSync(dir)) {
    for (const entry of readdirSync(dir)) rmSync(join(dir, entry), { recursive: true, force: true })
  } else {
    mkdirSync(dir, { recursive: true })
  }
  await simpleGit({ timeout }).clone(url, dir, ['--branch', BRANCH])
  await simpleGit(dir, { timeout }).addConfig('core.autocrlf', 'false') 
  return new ResilientBrainRepo(dir)
}


async function buildBrain(
  openaiKey: string,
  githubToken: string,
  repoSlug: string,
): Promise<Brain> {
  
  process.env.OPENAI_API_KEY = openaiKey

  
  
  
  assertEmbeddingDim(EMBEDDING_MODEL)

  const db = serverDb()
  
  
  
  
  
  
  
  const embedder = new EmbedderContextual(new MemoEmbedClient(new CostAwareEmbedClient(EMBEDDING_MODEL)), EMBEDDING_MODEL)
  const repo = await ensureRepo(repoSlug, githubToken)

  
  
  
  
  try {
    const { bootSyncSkills } = await import('./skillsSync')
    await bootSyncSkills()
  } catch (err) {
    console.warn('[buildBrain] boot-sync de skills falhou (não-fatal):', err)
  }

  const search = new SearchComPiso(db, embedder)
  const octokit = new Octokit({ auth: githubToken })
  
  
  
  
  const committer = new CommitterTituloSeguro(repo.dir, { repoSlug, octokit })
  const llm = new CostAwareDecideClient(OPENAI_MODEL)
  const writer = new NoteWriter(repo)
  const critic = new OpenAIMergeCritic(OPENAI_MODEL)
  const curator = new FidelityCurator(db, repo, search, llm, committer, writer, critic, octokit, repoSlug)
  const sync = new Sync(db, repo, embedder)

  return { db, repo, search, committer, curator, sync, embedder, octokit, repoSlug }
}


export interface BoundedBuildOpts {
  now?: () => number
  timeoutMs?: number
  cooldownMs?: number
}


export async function boundedCachedBrain(
  key: string,
  factory: () => Promise<Brain>,
  opts: BoundedBuildOpts = {},
): Promise<Brain> {
  const now = opts.now ?? Date.now
  const timeoutMs = opts.timeoutMs ?? BUILD_TIMEOUT_MS
  const cooldownMs = opts.cooldownMs ?? FAILED_BUILD_COOLDOWN_MS

  
  if (_failed && _failed.key === key && now() - _failed.at < cooldownMs) {
    throw new BrainUnreachableError()
  }
  if (_cache?.key === key) return _cache.brain

  
  
  const promise = withTimeout(factory(), timeoutMs, 'buildBrain').catch((e) => {
    const err = e instanceof NotConfiguredError ? e : new BrainUnreachableError(e)
    if (_cache?.key === key) _cache = null
    
    if (!(err instanceof NotConfiguredError)) _failed = { key, at: now() }
    throw err
  })
  _cache = { key, brain: promise }
  return promise
}

export async function getBrain(): Promise<Brain> {
  const [openaiKey, githubToken, repoSlug] = await Promise.all([
    getSecret(SECRET_KEYS.openai_api_key),
    getSecret(SECRET_KEYS.github_token),
    getSecret(SECRET_KEYS.github_repo),
  ])

  const missing: string[] = []
  if (!openaiKey) missing.push('openai_api_key')
  if (!githubToken) missing.push('github_token')
  if (!repoSlug) missing.push('github_repo')
  if (missing.length) throw new NotConfiguredError(missing)

  
  const key = createHash('sha256')
    .update(`${openaiKey}|${githubToken}|${repoSlug}`)
    .digest('hex')

  return boundedCachedBrain(key, () => buildBrain(openaiKey!, githubToken!, repoSlug!))
}


export function invalidateBrainCache(): void {
  _cache = null
  _failed = null
}
