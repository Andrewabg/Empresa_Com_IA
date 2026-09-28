

import { verifySignature } from './verify'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getBrain, NotConfiguredError } from '@/server/brain/runtime'
import { reconcileResilient } from '@/server/brain/reconcileResilient'
import { withCloneLock } from '@/server/brain/cloneLock'
import { recordEvent } from '@/data/events'









export const MAX_SEEN = 1000
const seenDeliveries = new Set<string>()


export function _resetSeenForTest(): void {
  seenDeliveries.clear()
}

function markSeen(deliveryId: string): void {
  if (seenDeliveries.size >= MAX_SEEN) {
    
    const oldest = seenDeliveries.values().next().value
    if (oldest !== undefined) seenDeliveries.delete(oldest)
  }
  seenDeliveries.add(deliveryId)
}



export interface WebhookDeps {
  getWebhookSecret: () => Promise<string | null>
  runReconcile: () => Promise<string>
}





export type WebhookResult =
  | { status: 503 }
  | { status: 401 }
  | { status: 200; result: string; deduped?: undefined }
  | { status: 200; deduped: true }
  
  | { status: 200; ok: true; skipped: string }
  | { status: 500; error: string }





const BRAIN_BRANCH = process.env.BRAIN_BRANCH ?? 'main'


function parseRef(rawBody: string | Buffer): string | null {
  try {
    const parsed = JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
    const ref = (parsed as { ref?: unknown }).ref
    return typeof ref === 'string' ? ref : null
  } catch {
    return null
  }
}



const defaultDeps: WebhookDeps = {
  getWebhookSecret: () => getSecret(SECRET_KEYS.webhook_secret),
  
  
  
  
  
  
  runReconcile: async () => {
    const b = await getBrain()
    return withCloneLock(() => reconcileResilient(b.db, b.repo, b.sync, b.embedder.version()))
  },
}




export async function handleWebhook(
  rawBody: string | Buffer,
  headers: Record<string, string | undefined> | Headers,
  deps: Partial<WebhookDeps> = {},
): Promise<WebhookResult> {
  const { getWebhookSecret, runReconcile } = { ...defaultDeps, ...deps }

  
  const getHeader = (name: string): string | undefined => {
    if (headers instanceof Headers) {
      return headers.get(name) ?? undefined
    }
    
    const lower = name.toLowerCase()
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lower) return v ?? undefined
    }
    return undefined
  }

  
  const secret = await getWebhookSecret()
  if (!secret) {
    console.warn('[webhook] webhook_secret not configured in Vault — returning 503')
    return { status: 503 }
  }

  
  const signatureHeader = getHeader('x-hub-signature-256')
  if (!verifySignature(rawBody, signatureHeader, secret)) {
    console.warn('[webhook] Invalid HMAC signature — returning 401')
    return { status: 401 }
  }

  
  
  
  
  
  
  const event = getHeader('x-github-event')
  if (event !== 'push') {
    console.debug(`[webhook] evento '${event ?? '(ausente)'}' ignorado (só 'push' reconcilia)`)
    return { status: 200, ok: true, skipped: `event:${event ?? 'ausente'}` }
  }
  const ref = parseRef(rawBody)
  const expectedRef = `refs/heads/${BRAIN_BRANCH}`
  if (ref !== expectedRef) {
    console.debug(`[webhook] push em '${ref ?? '(sem ref)'}' ignorado (só '${expectedRef}' reconcilia)`)
    return { status: 200, ok: true, skipped: `ref:${ref ?? 'ausente'}` }
  }

  
  
  
  
  
  const deliveryId = getHeader('x-github-delivery') ?? ''
  if (deliveryId && seenDeliveries.has(deliveryId)) {
    console.debug(`[webhook] Duplicate delivery ${deliveryId} — skipping reconcile`)
    return { status: 200, deduped: true }
  }

  
  try {
    const result = await runReconcile()
    
    if (deliveryId) markSeen(deliveryId)
    
    if (result !== 'noop') {
      try {
        
        const b = await getBrain()
        const headSha = await b.repo.headSha()
        await recordEvent({ id: 'recon:' + headSha, type: 'memory', label: 'Cérebro reconciliado' })
      } catch (err) {
        console.warn('[webhook/handler] recordEvent falhou (não-fatal):', err)
      }
    }
    return { status: 200, result }
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      console.warn('[webhook] NotConfiguredError during reconcile — returning 503:', err.message)
      
      return { status: 503 }
    }
    
    
    console.error('[webhook] Reconcile failed — returning 500:', err)
    return { status: 500, error: err instanceof Error ? err.message : String(err) }
  }
}
