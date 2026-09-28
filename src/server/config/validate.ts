

import { Octokit } from '@octokit/rest'
import { testComposioKey } from '@/server/actions/composio'
import { classificarFalhaDoModelo, type MotivoFalhaModelo } from '@/lib/modelo/falhaDoModelo'
import { checkComposioHealth } from './health'



export interface OpenAiTestResult {
  ok: boolean
  detail?: string
  
  motivo?: MotivoFalhaModelo
}


export const MODELO_DO_PROBE = 'gpt-5.1'


export async function testOpenAiKey(
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OpenAiTestResult> {
  try {
    const res = await fetchImpl('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) }
  }

  
  
  
  
  
  
  
  try {
    const res = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODELO_DO_PROBE, input: 'ok', max_output_tokens: 16 }),
    })
    if (res.ok) return { ok: true }
    const corpo = await res.json().catch(() => null)
    const motivo = classificarFalhaDoModelo(corpo ?? `HTTP ${res.status}`)
    
    
    
    return motivo ? { ok: false, motivo } : { ok: true }
  } catch {
    return { ok: true }
  }
}



export interface GithubTestResult {
  ok: boolean
  canWrite?: boolean
  detail?: string
}


export interface OctokitLike {
  users: {
    getAuthenticated: () => Promise<{ data: { login: string } }>
  }
  repos: {
    get: (args: {
      owner: string
      repo: string
    }) => Promise<{ data: { permissions?: { push?: boolean } } }>
  }
}

export type OctokitFactory = (token: string) => OctokitLike


const defaultOctokitFactory: OctokitFactory = (token) =>
  new Octokit({ auth: token }) as unknown as OctokitLike


export async function testGithubRepo(
  token: string,
  repo: string,
  octokitFactory: OctokitFactory = defaultOctokitFactory,
): Promise<GithubTestResult> {
  const parts = repo.split('/')
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
    return { ok: false, detail: 'formato inválido (use owner/repo)' }
  }
  const owner = parts[0].trim()
  const repoName = parts[1].trim()

  try {
    const octokit = octokitFactory(token)
    const { data } = await octokit.repos.get({ owner, repo: repoName })
    return { ok: true, canWrite: data.permissions?.push === true }
  } catch (err) {
    const status = (err as { status?: unknown })?.status
    if (status === 401) return { ok: false, detail: 'token inválido' }
    if (status === 404) return { ok: false, detail: 'repo não encontrado ou sem acesso' }
    return { ok: false, detail: err instanceof Error ? err.message : String(err) }
  }
}



export interface GithubTokenTestResult {
  ok: boolean
  login?: string
  detail?: string
}


export async function testGithubToken(
  token: string,
  octokitFactory: OctokitFactory = defaultOctokitFactory,
): Promise<GithubTokenTestResult> {
  try {
    const octokit = octokitFactory(token)
    const { data } = await octokit.users.getAuthenticated()
    return { ok: true, login: data.login }
  } catch (err) {
    const status = (err as { status?: unknown })?.status
    if (status === 401) return { ok: false, detail: 'token inválido' }
    return { ok: false, detail: err instanceof Error ? err.message : String(err) }
  }
}



export interface ComposioTestResult {
  ok: boolean
  error?: string
}



export type TestTarget = 'openai' | 'github' | 'github_token' | 'composio'

export interface ConfigTestResponse {
  openai: OpenAiTestResult | null
  github: GithubTestResult | null
  githubToken: GithubTokenTestResult | null
  composio: ComposioTestResult | null
}

export interface ConfigTestDeps {
  
  getStoredSecret: (key: string) => Promise<string | null>
  
  keys: {
    openai_api_key: string
    github_token: string
    github_repo: string
    composio_api_key: string
  }
  
  probeOpenAi?: (key: string) => Promise<OpenAiTestResult>
  probeGithub?: (token: string, repo: string) => Promise<GithubTestResult>
  probeGithubToken?: (token: string) => Promise<GithubTokenTestResult>
  probeComposio?: (key: string) => Promise<ComposioTestResult>
  
  checkHealth?: typeof checkComposioHealth
}


export async function runConfigTest(
  body: Record<string, unknown>,
  target: TestTarget | undefined,
  deps: ConfigTestDeps,
): Promise<ConfigTestResponse> {
  const {
    getStoredSecret,
    keys,
    probeOpenAi = testOpenAiKey,
    probeGithub = testGithubRepo,
    probeGithubToken = testGithubToken,
    probeComposio = testComposioKey,
    checkHealth = checkComposioHealth,
  } = deps

  const typed = (key: string): string | null => {
    const v = body[key]
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
  }

  const wantOpenai = target === undefined || target === 'openai'
  const wantGithub = target === undefined || target === 'github'
  const wantGithubToken = target === 'github_token'
  const wantComposio = target === 'composio'

  const openaiKey = wantOpenai
    ? typed(keys.openai_api_key) ?? (await getStoredSecret(keys.openai_api_key))
    : null

  let githubToken: string | null = null
  let githubRepo: string | null = null
  if (wantGithub) {
    
    ;[githubToken, githubRepo] = await Promise.all([
      (async () => typed(keys.github_token) ?? (await getStoredSecret(keys.github_token)))(),
      (async () => typed(keys.github_repo) ?? (await getStoredSecret(keys.github_repo)))(),
    ])
  }

  const tokenOnly = wantGithubToken
    ? typed(keys.github_token) ?? (await getStoredSecret(keys.github_token))
    : null

  const openai: OpenAiTestResult | null =
    wantOpenai && openaiKey ? await probeOpenAi(openaiKey) : null

  const github: GithubTestResult | null =
    wantGithub && githubToken && githubRepo ? await probeGithub(githubToken, githubRepo) : null

  const githubTokenResult: GithubTokenTestResult | null =
    wantGithubToken && tokenOnly ? await probeGithubToken(tokenOnly) : null

  
  
  
  let composio: ComposioTestResult | null = null
  if (wantComposio) {
    const composioTyped = typed(keys.composio_api_key)
    if (composioTyped) {
      composio = await probeComposio(composioTyped)
    } else {
      const h = await checkHealth()
      if (!h.configured) {
        composio = null 
      } else if (h.ok === true) {
        composio = { ok: true }
      } else {
        composio = { ok: false, ...(h.reason ? { error: h.reason } : {}) }
      }
    }
  }

  return { openai, github, githubToken: githubTokenResult, composio }
}
