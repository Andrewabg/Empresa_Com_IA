// src/server/custom/resolverDedup.ts — PURO. Extrai a chave de idempotência de um evento.
import type { WebhookCustom, WebhookEvent } from './contrato'

function lerPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc != null && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), obj)
}

export function resolverDedup(w: WebhookCustom, evento: WebhookEvent): string | null {
  if (typeof w.extrairDedup === 'function') {
    const v = w.extrairDedup(evento)
    return v == null ? null : String(v)
  }
  if (!w.dedupDe) return null
  const v = lerPath({ body: evento.body, headers: evento.headers }, w.dedupDe)
  if (v == null) return null
  if (typeof v === 'object') return null // objeto/array não é chave sã
  return String(v)
}
