








import { serverDb } from '../server/supabase'
import { redigirPII } from '@/lib/canais/pii'


export const RETENCAO_BRUTO_MS = 7 * 24 * 60 * 60 * 1000

export const TETO_BYTES = 32_000


export function prepararPayload(payload: unknown): Record<string, unknown> {
  let texto: string
  try {
    texto = typeof payload === 'string' ? payload : JSON.stringify(payload) ?? ''
  } catch {
    texto = '[payload não serializável]'
  }
  const limpo = redigirPII(texto)
  const truncado = limpo.length > TETO_BYTES
  const corpo = truncado ? limpo.slice(0, TETO_BYTES) : limpo
  
  
  
  return { bruto: corpo, ...(truncado ? { truncado: true, bytes_originais: limpo.length } : {}) }
}


export async function gravarEventoBruto(input: {
  provider: string; canalId: string | null; assinaturaOk: boolean; payload: unknown
}): Promise<void> {
  try {
    const { error } = await serverDb().from('canal_webhook_events').insert({
      provider: input.provider,
      canal_id: input.canalId,
      assinatura_ok: input.assinaturaOk,
      payload: prepararPayload(input.payload),
    })
    if (error) console.warn('[canalWebhookEvents] insert falhou (não-fatal):', error.message)
  } catch (err) {
    console.warn('[canalWebhookEvents] gravarEventoBruto fail-open:', err)
  }
}


export async function podarEventosBrutos(anteriorA: string): Promise<number> {
  const { data, error } = await serverDb().from('canal_webhook_events')
    .delete().lt('created_at', anteriorA).select('id')
  if (error) throw new Error(`podarEventosBrutos: ${error.message}`)
  return (data ?? []).length
}

export interface EventoBrutoRow {
  id: string; provider: string; canal_id: string | null
  assinatura_ok: boolean; payload: Record<string, unknown>; created_at: string
}


export async function listEventosBrutos(limite = 20): Promise<EventoBrutoRow[]> {
  const { data, error } = await serverDb().from('canal_webhook_events')
    .select().order('created_at', { ascending: false }).limit(limite)
  if (error) throw new Error(`listEventosBrutos: ${error.message}`)
  return (data ?? []) as EventoBrutoRow[]
}
