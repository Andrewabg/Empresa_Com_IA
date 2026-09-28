
import type { EntradaBaseRow } from '@/data/baseConhecimento'


export function filtrarRascunhos(entradas: EntradaBaseRow[]): EntradaBaseRow[] {
  return entradas.filter(e => !e.enabled && e.origem === 'aprendizado')
}

export interface BulkAction { action: 'enable_all' | 'discard_all'; ids: string[] }


export function parseBulkAction(body: unknown): BulkAction | null {
  if (!body || typeof body !== 'object') return null
  const b = body as { action?: unknown; ids?: unknown }
  if (b.action !== 'enable_all' && b.action !== 'discard_all') return null
  if (!Array.isArray(b.ids)) return null
  const ids = b.ids.filter((x): x is string => typeof x === 'string').slice(0, 500)
  return { action: b.action, ids }
}
