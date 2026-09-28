
import simpleGit from 'simple-git'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { withTimeout } from '@/lib/withTimeout'
import { motivoDoCerebroInacessivel, type MotivoDoCerebroInacessivel } from '@/lib/cerebro/inacessivel'
import { getSetting as getSettingDefault, setSetting as setSettingDefault } from '@/data/settings'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { cloneDir } from '@/server/brain/skillsPaths'
import { cloneUrl } from '@/server/brain/cloneUrl'


process.env.GIT_TERMINAL_PROMPT = '0'

const PROBE_TIMEOUT_MS = Number(process.env.BRAIN_SYNC_PROBE_TIMEOUT_MS) || 20_000
const NUDGE_TEXT =
  'Seu Segundo Cérebro parou de sincronizar com o GitHub. Reconecte em Configurações para retomar o sync das novidades.'

export interface BrainSyncResult { status: 'skipped' | 'ok' | 'down' | 'failed'; transitioned?: boolean }

export interface BrainSyncDeps {
  getSetting?: (k: string) => Promise<string | null>
  setSetting?: (k: string, v: string) => Promise<void>
  isConfigured?: () => Promise<boolean>
  cloneExists?: () => boolean
  probe?: () => Promise<void>
  nudge?: (texto: string) => Promise<void>
  now?: () => number
}


async function defaultIsConfigured(): Promise<boolean> {
  const [repo, token] = await Promise.all([
    getSecret(SECRET_KEYS.github_repo),
    getSecret(SECRET_KEYS.github_token),
  ])
  return !!repo && !!token
}


async function defaultProbe(): Promise<void> {
  const [repo, token] = await Promise.all([
    getSecret(SECRET_KEYS.github_repo),
    getSecret(SECRET_KEYS.github_token),
  ])
  const git = simpleGit(cloneDir(), { timeout: { block: PROBE_TIMEOUT_MS } })
  
  
  
  
  if (repo && token) await git.remote(['set-url', 'origin', cloneUrl(repo, token)])
  await git.listRemote(['--heads', 'origin'])
}


async function defaultNudge(texto: string): Promise<void> {
  const [token, ownerRaw] = await Promise.all([
    getSecret(SECRET_KEYS.telegram_bot_token),
    getSettingDefault('telegram_owner_chat'),
  ])
  if (!token || !ownerRaw) return
  const owner = JSON.parse(ownerRaw) as { chatId: string }   
  const { sendText } = await import('@/server/canais/telegram')
  await sendText(token, owner.chatId, texto, { parseMode: 'HTML' })
}

export async function runBrainSyncHealth(deps: BrainSyncDeps = {}): Promise<BrainSyncResult> {
  const get = deps.getSetting ?? getSettingDefault
  const set = deps.setSetting ?? setSettingDefault
  const cloneExists = deps.cloneExists ?? (() => existsSync(join(cloneDir(), '.git')))
  const isConfigured = deps.isConfigured ?? defaultIsConfigured
  const probe = deps.probe ?? defaultProbe
  const nudge = deps.nudge ?? defaultNudge
  const now = deps.now ?? Date.now

  
  
  
  try {
    if (!cloneExists() || !(await isConfigured())) return { status: 'skipped' }

    let ok: boolean
    
    
    
    let motivo: MotivoDoCerebroInacessivel = 'desconhecido'
    try { await withTimeout(probe(), PROBE_TIMEOUT_MS, 'brainSyncProbe'); ok = true }
    catch (e) { ok = false; motivo = motivoDoCerebroInacessivel(e) }

    const prev = await get('brain_sync_ok')
    await set('brain_sync_ok', ok ? 'true' : 'false')
    
    
    await set('brain_sync_motivo', ok ? '' : motivo)
    await set('brain_sync_checked_at', new Date(now()).toISOString())

    let transitioned = false
    if (!ok && prev === 'true') {   
      transitioned = true
      try { await nudge(NUDGE_TEXT) } catch {  }
    }
    return { status: ok ? 'ok' : 'down', transitioned }
  } catch (e) {
    console.warn('[brainSyncHealth] fail-open:', e instanceof Error ? e.message : e)
    return { status: 'failed' }
  }
}
