
import { getStamp } from '@/server/stamp'
import { readLicenseCache } from '@/server/license/cache'
import { getLicenseState, firehoseGraced } from '@/lib/license-state'
import { getUpdateAvailability, parseVersionTag } from '@/lib/release'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getSetting, setSetting } from '@/data/settings'
import { diagnoseRebuildFailure } from '@/lib/rebuild-diagnosis'
import { maskDeployWebhook } from '@/lib/deploy-webhook-mask'

export const UPDATE_STATE_KEY = 'update_state'



const UPDATE_DIVERGENCE_KEY = 'update_divergence'


const UPDATE_DEPLOY_TRIGGER_KEY = 'update_deploy_trigger'



const UPDATE_LAST_REF_KEY = 'update_last_ref'


export type DeployTriggerResult = { kind: 'fired' | 'failed' | 'absent'; detail?: string; at: string } | null


function safeParseTrigger(raw: string | null): DeployTriggerResult {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' && typeof v.kind === 'string' ? (v as NonNullable<DeployTriggerResult>) : null
  } catch {
    return null
  }
}

export type UpdateState = {
  phase: 'baixando' | 'extraindo' | 'publicando' | 'aguardando_rebuild' | 'erro'
  target: string
  error?: string
  at: string
} | null

const IN_FLIGHT: ReadonlyArray<string> = ['baixando', 'extraindo', 'publicando']
export const STALE_APPLY_MS = 15 * 60 * 1000 



export const STALE_REBUILD_MS = 20 * 60 * 1000


function safeParseState(raw: string | null): UpdateState {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as NonNullable<UpdateState>) : null
  } catch {
    return null 
  }
}


export async function setUpdateState(state: NonNullable<UpdateState>): Promise<void> {
  await setSetting(UPDATE_STATE_KEY, JSON.stringify(state))
}

export async function getUpdateStatus(now: number = Date.now()) {
  const [cache, repo, rawState, webhookSecret, divergenceRaw, brainRepo, triggerRaw, lastRefRaw] =
    await Promise.all([
      readLicenseCache(),
      getSecret(SECRET_KEYS.update_repo),
      getSetting(UPDATE_STATE_KEY),
      getSecret(SECRET_KEYS.easypanel_deploy_webhook),
      getSetting(UPDATE_DIVERGENCE_KEY), 
      getSecret(SECRET_KEYS.github_repo), 
      getSetting(UPDATE_DEPLOY_TRIGGER_KEY), 
      getSetting(UPDATE_LAST_REF_KEY), 
    ])
  const stamp = getStamp()
  const avail = getUpdateAvailability(stamp?.ref ?? null, cache?.latest_version ?? null)
  
  
  
  
  const licenseState = getLicenseState(cache, now)
  const canCheckUpdates = firehoseGraced(licenseState)
  let state: UpdateState = safeParseState(rawState)
  
  if (rawState && state === null) {
    await setSetting(UPDATE_STATE_KEY, '')
  }
  
  if (state?.phase === 'aguardando_rebuild' && avail.current === state.target) {
    state = null
    await setSetting(UPDATE_STATE_KEY, '')
  }
  
  
  if (state && IN_FLIGHT.includes(state.phase)) {
    const startedAt = Date.parse(state.at)
    if (Number.isNaN(startedAt) || now - startedAt > STALE_APPLY_MS) {
      state = { ...state, phase: 'erro', error: 'Atualização interrompida — tente de novo.' }
      await setSetting(UPDATE_STATE_KEY, JSON.stringify(state))
    }
  }
  
  
  
  
  if (state?.phase === 'aguardando_rebuild') {
    const startedAt = Date.parse(state.at)
    if (Number.isNaN(startedAt) || now - startedAt > STALE_REBUILD_MS) {
      
      let diverged = false
      if (divergenceRaw) {
        try {
          const parsed = JSON.parse(divergenceRaw) as { status?: string } | null
          diverged = parsed?.status === 'divergente'
        } catch {
          
        }
      }
      
      
      
      
      
      
      const ultimoRef = (lastRefRaw ?? '').trim()
      const publicado = parseVersionTag(ultimoRef) ? ultimoRef === state.target : undefined
      state = {
        ...state,
        phase: 'erro',
        error: diagnoseRebuildFailure({
          diverged,
          migrationsAuto: Boolean(process.env.SUPABASE_DB_URL),
          target: state.target,
          ...(publicado === undefined ? {} : { publicado }),
        }),
      }
      await setSetting(UPDATE_STATE_KEY, JSON.stringify(state))
    }
  }
  
  
  const latestUnrecognized =
    avail.latest != null &&
    avail.latest.trim().length > 0 &&
    parseVersionTag(avail.latest) === null &&
    avail.current != null
  return {
    ...avail,
    repoConfigured: Boolean(repo),
    update_repo: repo ?? null, 
    migrationsAuto: Boolean(process.env.SUPABASE_DB_URL),
    latestUnrecognized,
    state,
    hasWebhook: Boolean(webhookSecret),
    deployWebhookHint: maskDeployWebhook(webhookSecret),
    github_repo: brainRepo ?? null, 
    
    canCheckUpdates,
    licenseState,
    
    
    deployTriggerResult: safeParseTrigger(triggerRaw),
  }
}
