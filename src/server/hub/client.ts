












import { randomUUID } from 'node:crypto'
import { getSetting, setSetting } from '@/data/settings'
import { writeLicenseCache, markFirstActivated } from '@/server/license/cache'
import { getSecret } from '@/server/secrets'
import { parseStamp } from '@/lib/stamp'
import stampRaw from '@/server/awave-stamp.json'
import { verifyActiveSignature } from '@/server/hub/verify-signature'


const INSTANCE_ID_KEY = 'instance_id'

const CONTINUATION_TOKEN_KEY = 'continuation_token'

const PROVENANCE_PRIMARY_KEY = 'install_nonce'
const PROVENANCE_BACKUP_KEY = 'hb_integrity'

const VALIDATE_PATH = '/api/hub/validate'

const TIMEOUT_MS = 5000

const DEFAULT_HUB_URL = 'https://elitedaia.com.br'


export function getHubUrl(): string {
  return process.env.HUB_URL || DEFAULT_HUB_URL
}


export interface ValidateDeps {
  now?: number
  fetchImpl?: typeof fetch
  
  verifyImpl?: (f: {
    status: string
    entitled: boolean
    instanceId: string | null | undefined
    sig: string | undefined
    sigIat: number | undefined
  }) => boolean
}


export interface ValidateResult {
  offline: boolean
  status?: 'active' | 'revoked' | 'in_use_elsewhere'
}


interface HubPayload {
  status: 'active' | 'revoked' | 'in_use_elsewhere'
  buyer_name?: string
  club_incluso_ate?: string
  latest_version?: string
  continuation_token?: string
  
  entitled?: boolean
  
  block?: 'hard'
  
  reason?: string
  
  sig?: string
  
  sig_iat?: number
  
  seal?: string
}


function parseEnvelope(json: unknown): HubPayload | null {
  if (!json || typeof json !== 'object') return null
  const data = (json as { data?: unknown }).data
  if (!data || typeof data !== 'object') return null
  const status = (data as { status?: unknown }).status
  if (status !== 'active' && status !== 'revoked' && status !== 'in_use_elsewhere') return null
  const buyer_name = (data as { buyer_name?: unknown }).buyer_name
  const club_incluso_ate = (data as { club_incluso_ate?: unknown }).club_incluso_ate
  const latest_version = (data as { latest_version?: unknown }).latest_version
  const continuation_token = (data as { continuation_token?: unknown }).continuation_token
  const entitled = (data as { entitled?: unknown }).entitled
  const block = (data as { block?: unknown }).block
  const reason = (data as { reason?: unknown }).reason
  const sig = (data as { sig?: unknown }).sig
  const sig_iat = (data as { sig_iat?: unknown }).sig_iat
  const seal = (data as { seal?: unknown }).seal
  return {
    status,
    ...(typeof buyer_name === 'string' ? { buyer_name } : {}),
    ...(typeof club_incluso_ate === 'string' ? { club_incluso_ate } : {}),
    ...(typeof latest_version === 'string' && latest_version.length > 0 ? { latest_version } : {}),
    ...(typeof continuation_token === 'string' && continuation_token.length > 0 ? { continuation_token } : {}),
    ...(typeof entitled === 'boolean' ? { entitled } : {}),
    ...(block === 'hard' ? { block: 'hard' as const } : {}),
    ...(typeof reason === 'string' && reason.length > 0 ? { reason } : {}),
    ...(typeof sig === 'string' && sig.length > 0 ? { sig } : {}),
    ...(typeof sig_iat === 'number' ? { sig_iat } : {}),
    ...(typeof seal === 'string' && seal.length > 0 ? { seal } : {}),
  }
}


async function postOnce(
  fetchImpl: typeof fetch,
  url: string,
  body: string,
): Promise<HubPayload> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`hub validate: HTTP ${res.status}`)
    const payload = parseEnvelope(await res.json())
    if (!payload) throw new Error('hub validate: envelope inválido')
    return payload
  } finally {
    clearTimeout(timer)
  }
}


export async function validateLicense(
  licenseKey: string,
  deps: ValidateDeps = {},
): Promise<ValidateResult> {
  const hubUrl = getHubUrl()

  const fetchImpl = deps.fetchImpl ?? fetch
  const now = deps.now ?? Date.now()

  
  let instanceId = await getSetting(INSTANCE_ID_KEY)
  if (!instanceId) {
    instanceId = randomUUID()
    await setSetting(INSTANCE_ID_KEY, instanceId)
  }

  
  const contToken = await getSetting(CONTINUATION_TOKEN_KEY)

  
  
  
  
  const stampId = parseStamp(stampRaw)?.license_id || null

  
  
  let primarySeal: string | null = null
  let backupSeal: string | null = null
  try {
    primarySeal = await getSetting(PROVENANCE_PRIMARY_KEY)
    backupSeal = await getSetting(PROVENANCE_BACKUP_KEY)
  } catch {
    
  }
  const storedSeal = primarySeal || backupSeal

  const url = `${hubUrl.replace(/\/+$/, '')}${VALIDATE_PATH}`
  const body = JSON.stringify({
    license_key: licenseKey,
    instance_id: instanceId,
    ...(contToken ? { continuation_token: contToken } : {}),
    ...(stampId ? { stamp_id: stampId } : {}),
    ...(storedSeal ? { stored_seal: storedSeal } : {}),
  })

  
  let payload: HubPayload | null = null
  for (let attempt = 0; attempt < 2 && !payload; attempt++) {
    try {
      payload = await postOnce(fetchImpl, url, body)
    } catch {
      payload = null
    }
  }

  
  if (!payload) return { offline: true }

  
  
  
  
  
  if (payload.status === 'active') {
    const verify = deps.verifyImpl ?? verifyActiveSignature
    const signatureOk = verify({
      status: payload.status,
      entitled: payload.entitled === true,
      instanceId,
      sig: payload.sig,
      sigIat: payload.sig_iat,
    })
    if (!signatureOk) return { offline: true }
  }

  
  
  
  
  await writeLicenseCache({
    hub_status: payload.status,
    ...(payload.buyer_name !== undefined ? { buyer_name: payload.buyer_name } : {}),
    ...(payload.latest_version !== undefined ? { latest_version: payload.latest_version } : {}),
    ...(payload.club_incluso_ate !== undefined ? { club_incluso_ate: payload.club_incluso_ate } : {}),
    ...(payload.entitled !== undefined ? { entitled: payload.entitled } : {}),
    last_ok_at: new Date(now).toISOString(),
    ...(payload.block === 'hard' ? { hard_block: true } : {}),
    
    
    ...(payload.reason !== undefined ? { firehose_reason: payload.reason } : {}),
  })
  
  await markFirstActivated(now)
  
  if (payload.continuation_token) await setSetting(CONTINUATION_TOKEN_KEY, payload.continuation_token)

  
  
  
  
  
  
  
  try {
    
    
    
    const effectiveSeal = storedSeal || payload.seal
    if (effectiveSeal) {
      if (!primarySeal) await setSetting(PROVENANCE_PRIMARY_KEY, effectiveSeal)
      if (!backupSeal) await setSetting(PROVENANCE_BACKUP_KEY, effectiveSeal)
    }
  } catch {
    
  }

  return { offline: false, status: payload.status }
}


export async function heartbeat(deps: ValidateDeps = {}): Promise<void> {
  try {
    const key = await getSecret('license_key')
    if (!key) return
    await validateLicense(key, deps)
  } catch {
    
  }
}
