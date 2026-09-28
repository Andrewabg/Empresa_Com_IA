



import { Octokit } from '@octokit/rest'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getManifest } from '@/server/manifest'
import { MANIFEST_EXCLUDES } from '@/lib/manifest'
import { stripCustomPaths } from '@/lib/custom-zone'
import { diffManifest, type DivergenceReport } from '@/lib/manifest-diff'

export interface TreeOctokitLike {
  repos: { get: (a: { owner: string; repo: string }) => Promise<{ data: { default_branch: string } }> }
  git: {
    getTree: (a: { owner: string; repo: string; tree_sha: string; recursive: string }) => Promise<{
      data: { tree: Array<{ path?: string; type?: string; sha?: string }>; truncated?: boolean }
    }>
  }
}
export type TreeOctokitFactory = (token: string) => TreeOctokitLike
const defaultFactory: TreeOctokitFactory = (token) => new Octokit({ auth: token }) as unknown as TreeOctokitLike

export interface DetectDeps {
  getRepo?: () => Promise<string | null>
  getToken?: () => Promise<string | null>
  getCanonical?: () => Record<string, string> | null
  octokitFactory?: TreeOctokitFactory
}
const UNKNOWN: DivergenceReport = { status: 'desconhecido', modified: [], added: [], removed: [] }

export async function detectDivergence(deps: DetectDeps = {}): Promise<DivergenceReport> {
  const getRepo = deps.getRepo ?? (() => getSecret(SECRET_KEYS.update_repo))
  const getToken = deps.getToken ?? (() => getSecret(SECRET_KEYS.github_token))
  const getCanonical = deps.getCanonical ?? (() => getManifest()?.files ?? null)
  const factory = deps.octokitFactory ?? defaultFactory
  try {
    const canonical = getCanonical()
    if (!canonical) return UNKNOWN
    const [repo, token] = await Promise.all([getRepo(), getToken()])
    if (!repo || !token) return UNKNOWN
    const [owner, name] = repo.split('/')
    if (!owner || !name) return UNKNOWN
    const octokit = factory(token)
    const { data: repoData } = await octokit.repos.get({ owner, repo: name })
    const { data: treeData } = await octokit.git.getTree({
      owner, repo: name, tree_sha: repoData.default_branch, recursive: '1',
    })
    if (treeData.truncated) return UNKNOWN
    const actual: Record<string, string> = {}
    for (const e of treeData.tree) {
      if (e.type === 'blob' && typeof e.path === 'string' && typeof e.sha === 'string') actual[e.path] = e.sha
    }
    
    
    return diffManifest(canonical, stripCustomPaths(actual), MANIFEST_EXCLUDES)
  } catch {
    return UNKNOWN
  }
}
