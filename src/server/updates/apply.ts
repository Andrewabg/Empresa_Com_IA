










import { mkdtemp, cp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import AdmZip from 'adm-zip'
import simpleGit from 'simple-git'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getSetting, setSetting } from '@/data/settings'
import { planPublishEntries, CUSTOM_DIR } from '@/lib/custom-zone'
import { sanitizarCredenciaisDeErro, motivoSeguro } from '@/lib/sanitizarErro'
import { motivoDoGitFalho, type EtapaDoGit } from '@/lib/motivoDoGit'
import { setUpdateState } from '@/server/updates/status'
import { detectDivergence } from '@/server/updates/detect'
import type { DivergenceReport } from '@/lib/manifest-diff'


const DEFAULT_HUB_URL = 'https://elitedaia.com.br'


export const UPDATE_DIVERGENCE_KEY = 'update_divergence'
export const UPDATE_LAST_COMMIT_KEY = 'update_last_commit'

export const UPDATE_DEPLOY_TRIGGER_KEY = 'update_deploy_trigger'

export const UPDATE_LAST_REF_KEY = 'update_last_ref'


export type WebhookOutcome = { ok: boolean; detail: string }


export type DeployTriggerResult = { kind: 'fired' | 'failed' | 'absent'; detail?: string; at: string }


export function assertSafeZipEntries(names: string[]): void {
  for (const n of names) {
    const segs = n.split(/[\\/]/)
    if (
      n.startsWith('/') ||
      n.startsWith('\\') ||
      /^[a-zA-Z]:[\\/]/.test(n) ||
      segs.includes('..') ||
      
      
      
      segs.some((s) => s.toLowerCase() === '.git')
    ) {
      throw new Error(`entrada de zip insegura: ${n}`)
    }
  }
}


function normalizeRepoSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '')
}


export function sanitizeUpdateError(msg: string): string {
  return sanitizarCredenciaisDeErro(msg)
}


function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}


export async function seedMissingFiles(srcDir: string, destDir: string): Promise<void> {
  
  
  
  
  await cp(srcDir, destDir, { recursive: true, force: false }).catch((e: NodeJS.ErrnoException) => {
    if (e?.code !== 'ENOENT') throw e
  })
}


export async function publishTree(cloneDir: string, extractDir: string): Promise<void> {
  const plan = planPublishEntries({
    cloneEntries: await readdir(cloneDir),
    extractEntries: await readdir(extractDir),
  })
  for (const entry of plan.wipe) {
    await rm(join(cloneDir, entry), { recursive: true, force: true })
  }
  for (const entry of plan.copy) {
    await cp(join(extractDir, entry), join(cloneDir, entry), { recursive: true })
  }
  
  
  
  if (plan.seededCustom) console.log('[update] zona custom/ semeada (scaffold inicial)')
  if (plan.seedCustomInPlace) {
    console.log('[update] arquivos faltantes semeados em custom/ (heal)')
    
    await seedMissingFiles(join(extractDir, CUSTOM_DIR), join(cloneDir, CUSTOM_DIR))
  }
}


export interface ApplyDeps {
  downloadZip?: (target: string) => Promise<Buffer>
  extractZip?: (buf: Buffer) => Promise<string> 
  detect?: () => Promise<DivergenceReport> 
  publishToRepo?: (extractDir: string, target: string, diverged: boolean) => Promise<{ pushedSha: string | null }>
  postWebhook?: (url: string) => Promise<WebhookOutcome>
  
  esperarArquivo?: (input: { repo: string; token: string; sha: string }) => Promise<boolean>
  fetchImpl?: typeof fetch
  nowIso?: () => string 
  cleanup?: (dir: string) => Promise<void>
}




async function defaultDownloadZip(_target: string, fetchImpl: typeof fetch): Promise<Buffer> {
  const hubUrl = (process.env.HUB_URL || DEFAULT_HUB_URL).replace(/\/+$/, '')
  const [licenseKey, instanceId] = await Promise.all([
    getSecret('license_key'), 
    getSetting('instance_id'),
  ])
  const res = await fetchImpl(`${hubUrl}/api/hub/download-instance`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey, instance_id: instanceId }),
  })
  if (!res.ok) {
    throw new Error(`licença inativa ou Hub indisponível (HTTP ${res.status})`)
  }
  return Buffer.from(await res.arrayBuffer())
}


export async function defaultExtractZip(buf: Buffer): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'awave-update-extract-'))
  try {
    const zip = new AdmZip(buf)
    assertSafeZipEntries(zip.getEntries().map((e) => e.entryName))
    zip.extractAllTo(dir, true) 
    
    
    await rm(join(dir, '.git'), { recursive: true, force: true })
    return dir
  } catch (err) {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
    throw err
  }
}


async function defaultPublishToRepo(
  extractDir: string,
  target: string,
  diverged: boolean,
): Promise<{ pushedSha: string | null }> {
  const [token, repo] = await Promise.all([
    getSecret(SECRET_KEYS.github_token),
    getSecret(SECRET_KEYS.update_repo),
  ])
  if (!token || !repo) {
    throw new Error('Configure o repositório do Motor e o token do GitHub antes de atualizar.')
  }
  const cloneDir = await mkdtemp(join(tmpdir(), 'awave-update-clone-'))
  try {
    
    
    const url = `https://x-access-token:${token}@github.com/${repo}.git`
    
    
    
    const branchDoBackup = `awave-backup/pre-${target}`
    const noGit = async <T>(etapa: EtapaDoGit, fazer: () => Promise<T>): Promise<T> => {
      try {
        return await fazer()
      } catch (err) {
        throw new Error(motivoDoGitFalho(motivoSeguro(err), etapa, branchDoBackup))
      }
    }
    await noGit('baixar', () => simpleGit().clone(url, cloneDir, ['--depth', '1']))
    const git = simpleGit(cloneDir)
    await git.addConfig('core.autocrlf', 'false') 

    
    
    
    if (diverged) {
      const existing = await git.listRemote(['--heads', 'origin', branchDoBackup]).catch(() => '')
      if (!existing || !existing.trim()) {
        await noGit('backup', () => git.push('origin', `HEAD:refs/heads/${branchDoBackup}`))
      }
    }

    
    
    await publishTree(cloneDir, extractDir)

    await git.addConfig('user.name', 'Awave Updater')
    await git.addConfig('user.email', 'updater@awave.local')
    await git.add('-A')
    
    
    
    
    const status = await git.status()
    if (status.isClean()) return { pushedSha: null }
    await git.commit(`release: ${target} (auto-update)`)
    const pushedSha = (await git.revparse(['HEAD'])).trim()
    await noGit('enviar', () => git.push())
    return { pushedSha }
  } finally {
    await rm(cloneDir, { recursive: true, force: true }).catch(() => {})
  }
}


async function defaultPostWebhook(url: string, fetchImpl: typeof fetch): Promise<WebhookOutcome> {
  const hit = (method: 'POST' | 'GET') =>
    fetchImpl(url, { method, redirect: 'manual', signal: AbortSignal.timeout(5000) })
  try {
    const post = await hit('POST')
    if (post.ok) return { ok: true, detail: `HTTP ${post.status}` }
    
    
    
    
    if (!METODO_RECUSADO.has(post.status)) {
      return { ok: false, detail: `HTTP ${post.status}` }
    }
    const get = await hit('GET')
    return get.ok
      ? { ok: true, detail: `HTTP ${get.status} (GET)` }
      : { ok: false, detail: `HTTP ${post.status} (POST) / ${get.status} (GET)` }
  } catch (err) {
    
    return { ok: false, detail: sanitizeUpdateError(messageOf(err)) }
  }
}


export function acionarDeploy(url: string, fetchImpl: typeof fetch = fetch): Promise<WebhookOutcome> {
  return defaultPostWebhook(url, fetchImpl)
}


const METODO_RECUSADO: ReadonlySet<number> = new Set([404, 405, 501])


export const ESPERAS_ARQUIVO_MS: readonly number[] = [0, 2000, 4000, 8000, 8000]

export async function esperarArquivoNoGithub(
  input: { repo: string; token: string; sha: string },
  deps: { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void>; esperas?: readonly number[] } = {},
): Promise<boolean> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const dormir = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const esperas = deps.esperas ?? ESPERAS_ARQUIVO_MS
  for (const espera of esperas) {
    if (espera > 0) await dormir(espera)
    try {
      const res = await fetchImpl(
        `https://api.github.com/repos/${input.repo}/tarball/${input.sha}`,
        {
          headers: { Authorization: `Bearer ${input.token}`, Accept: 'application/vnd.github+json' },
          redirect: 'manual',
          signal: AbortSignal.timeout(15000),
        },
      )
      
      
      if (res.status === 302 || res.status === 301) return true
      if (res.ok) { void res.body?.cancel().catch(() => {}); return true }
    } catch {  }
  }
  return false
}


async function defaultCleanup(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true })
}


export async function applyUpdate(target: string, deps: ApplyDeps = {}): Promise<void> {
  const nowIso = deps.nowIso ?? (() => new Date().toISOString())
  const fetchImpl = deps.fetchImpl ?? fetch
  const downloadZip = deps.downloadZip ?? ((t: string) => defaultDownloadZip(t, fetchImpl))
  const extractZip = deps.extractZip ?? defaultExtractZip
  const detect = deps.detect ?? detectDivergence
  const publishToRepo = deps.publishToRepo ?? defaultPublishToRepo
  const postWebhook = deps.postWebhook ?? ((url: string) => defaultPostWebhook(url, fetchImpl))
  const esperarArquivo = deps.esperarArquivo
    ?? ((i: { repo: string; token: string; sha: string }) => esperarArquivoNoGithub(i, { fetchImpl }))
  const cleanup = deps.cleanup ?? defaultCleanup

  let extractDir: string | null = null
  try {
    
    const [repo, token, brainRepo] = await Promise.all([
      getSecret(SECRET_KEYS.update_repo),
      getSecret(SECRET_KEYS.github_token),
      getSecret(SECRET_KEYS.github_repo),
    ])
    if (!repo || !token) {
      throw new Error('Configure o repositório do Motor e o token do GitHub antes de atualizar.')
    }
    
    
    
    
    
    if (brainRepo && normalizeRepoSlug(repo) === normalizeRepoSlug(brainRepo)) {
      throw new Error('O repositório do Motor não pode ser o mesmo do Cérebro — atualização abortada.')
    }

    await setUpdateState({ phase: 'baixando', target, at: nowIso() })
    const buf = await downloadZip(target)

    await setUpdateState({ phase: 'extraindo', target, at: nowIso() })
    extractDir = await extractZip(buf)

    await setUpdateState({ phase: 'publicando', target, at: nowIso() })
    const divergence = await detect() 
    await setSetting(UPDATE_DIVERGENCE_KEY, JSON.stringify(divergence)) 
    
    
    
    
    const { pushedSha } = await publishToRepo(extractDir, target, divergence.status !== 'limpo')
    if (pushedSha) {
      await setSetting(UPDATE_LAST_COMMIT_KEY, pushedSha)
      
      
      
      
      await setSetting(UPDATE_LAST_REF_KEY, target)
    }

    
    
    
    const webhook = await getSecret(SECRET_KEYS.easypanel_deploy_webhook)
    let trigger: DeployTriggerResult
    if (webhook) {
      
      
      if (pushedSha) {
        try { await esperarArquivo({ repo, token, sha: pushedSha }) }
        catch (e) { console.warn('[applyUpdate] espera do arquivo no GitHub fail-open:', e) }
      }
      try {
        const outcome = await postWebhook(webhook)
        trigger = outcome.ok
          ? { kind: 'fired', at: nowIso() }
          : { kind: 'failed', detail: outcome.detail, at: nowIso() }
      } catch (err) {
        
        trigger = { kind: 'failed', detail: sanitizeUpdateError(messageOf(err)), at: nowIso() }
      }
      if (trigger.kind === 'failed') {
        console.warn('[applyUpdate] webhook de deploy falhou (não-fatal):', trigger.detail)
      }
    } else {
      trigger = { kind: 'absent', at: nowIso() }
    }
    await setSetting(UPDATE_DEPLOY_TRIGGER_KEY, JSON.stringify(trigger))

    await setUpdateState({ phase: 'aguardando_rebuild', target, at: nowIso() })
  } catch (err) {
    await setUpdateState({
      phase: 'erro',
      target,
      at: nowIso(),
      error: sanitizeUpdateError(messageOf(err)),
    })
    throw err
  } finally {
    if (extractDir) {
      try {
        await cleanup(extractDir)
      } catch {
        
      }
    }
  }
}
