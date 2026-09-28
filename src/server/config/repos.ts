

import { Octokit } from '@octokit/rest'




export interface OctokitLike {
  repos: {
    listForAuthenticatedUser: (args: {
      per_page: number
      sort: string
      affiliation: string
    }) => Promise<{
      data: Array<{
        full_name: string
        private: boolean
        permissions?: { push?: boolean }
      }>
    }>
    createForAuthenticatedUser: (args: {
      name: string
      private: boolean
      auto_init: boolean
      description: string
    }) => Promise<{ data: { full_name: string } }>
  }
}

export type OctokitFactory = (token: string) => OctokitLike


const defaultOctokitFactory: OctokitFactory = (token) =>
  new Octokit({ auth: token }) as unknown as OctokitLike



export interface RepoEntry {
  fullName: string
  private: boolean
}

export interface ListReposResult {
  ok: boolean
  repos?: RepoEntry[]
  detail?: string
}


export async function listWritableRepos(
  token: string,
  octokitFactory: OctokitFactory = defaultOctokitFactory,
): Promise<ListReposResult> {
  try {
    const octokit = octokitFactory(token)
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      affiliation: 'owner,collaborator,organization_member',
    })
    
    const repos = data
      .filter((r) => r.permissions?.push === true)
      .map((r) => ({ fullName: r.full_name, private: r.private }))
    return { ok: true, repos }
  } catch (err) {
    const status = (err as { status?: unknown })?.status
    if (status === 401) return { ok: false, detail: 'token inválido' }
    return { ok: false, detail: err instanceof Error ? err.message : String(err) }
  }
}



export interface CreateRepoResult {
  ok: boolean
  fullName?: string
  detail?: string
}


const REPO_NAME_RE = /^[A-Za-z0-9._-]+$/


export async function createBrainRepo(
  token: string,
  name: string,
  octokitFactory: OctokitFactory = defaultOctokitFactory,
): Promise<CreateRepoResult> {
  const trimmed = (name ?? '').trim()
  if (!trimmed || !REPO_NAME_RE.test(trimmed)) {
    return { ok: false, detail: 'nome inválido' }
  }

  try {
    const octokit = octokitFactory(token)
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: trimmed,
      private: true,
      auto_init: true,
      description: 'Awave Agents — Segundo Cérebro',
    })
    return { ok: true, fullName: data.full_name }
  } catch (err) {
    const status = (err as { status?: unknown })?.status
    if (status === 422) {
      return { ok: false, detail: 'já existe um repo com esse nome (ou nome inválido)' }
    }
    if (status === 401) return { ok: false, detail: 'token inválido' }
    if (status === 403) return { ok: false, detail: 'token sem permissão pra criar repos' }
    return { ok: false, detail: err instanceof Error ? err.message : String(err) }
  }
}
