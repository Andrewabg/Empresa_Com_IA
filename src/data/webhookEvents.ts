



import { serverDb } from '@/server/supabase'

export type WebhookEventStatus = 'queued' | 'processing' | 'done' | 'dead' | 'rejected'

export interface WebhookEventRow {
  id: string
  slug: string
  dedup_key: string | null
  payload: Record<string, unknown>
  headers: Record<string, unknown> | null
  status: WebhookEventStatus
  attempts: number
  next_attempt_at: string | null
  last_error: string | null
  received_at: string
  processed_at: string | null
  claimed_at: string | null
}

export interface EnfileirarInput {
  slug: string
  dedupKey?: string
  payload: Record<string, unknown>
  headers?: Record<string, unknown>
}


export async function enfileirar(
  input: EnfileirarInput,
): Promise<{ created: boolean; row?: WebhookEventRow }> {
  const { data, error } = await serverDb()
    .from('webhook_events')
    .insert({
      slug: input.slug,
      dedup_key: input.dedupKey ?? null,
      payload: input.payload,
      headers: input.headers ?? {},
    })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') return { created: false }
    throw new Error(`enfileirar: ${error.message}`)
  }
  return { created: true, row: data as WebhookEventRow }
}


export async function claimLote(limit: number): Promise<WebhookEventRow[]> {
  const agora = new Date().toISOString()
  const { data: candidatos, error: selErr } = await serverDb()
    .from('webhook_events')
    .select('id')
    .eq('status', 'queued')
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${agora}`)
    .order('received_at', { ascending: true })
    .limit(limit)
  if (selErr) throw new Error(`claimLote (select): ${selErr.message}`)

  const vencedores: WebhookEventRow[] = []
  for (const { id } of candidatos ?? []) {
    const { data, error } = await serverDb()
      .from('webhook_events')
      .update({ status: 'processing', claimed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'queued')
      .select()
    if (error) throw new Error(`claimLote (claim): ${error.message}`)
    if (data && data.length === 1) vencedores.push(data[0] as WebhookEventRow)
  }
  return vencedores
}


export async function marcarDone(id: string): Promise<void> {
  const { error } = await serverDb()
    .from('webhook_events')
    .update({ status: 'done', processed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'processing')
  if (error) throw new Error(`marcarDone: ${error.message}`)
}

export interface MarcarRetryInput {
  attempts: number
  dead: boolean
  nextAttemptAt: string | null
  erro: string
}


export async function marcarRetry(id: string, input: MarcarRetryInput): Promise<void> {
  const { error } = await serverDb()
    .from('webhook_events')
    .update({
      status: input.dead ? 'dead' : 'queued',
      attempts: input.attempts,
      next_attempt_at: input.nextAttemptAt,
      last_error: input.erro,
      claimed_at: null,
    })
    .eq('id', id)
    .eq('status', 'processing')
  if (error) throw new Error(`marcarRetry: ${error.message}`)
}

export interface RegistrarRejeitadoInput {
  slug: string
  headers?: Record<string, unknown>
  payload?: Record<string, unknown>
  erro: string
}


export async function registrarRejeitado(input: RegistrarRejeitadoInput): Promise<void> {
  const { error } = await serverDb()
    .from('webhook_events')
    .insert({
      slug: input.slug,
      dedup_key: null,
      payload: input.payload ?? {},
      headers: input.headers ?? {},
      status: 'rejected',
      last_error: input.erro,
    })
  if (error) throw new Error(`registrarRejeitado: ${error.message}`)
}


export async function listarRecentes(limit: number): Promise<WebhookEventRow[]> {
  const { data, error } = await serverDb()
    .from('webhook_events')
    .select()
    .order('received_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listarRecentes: ${error.message}`)
  return (data ?? []) as WebhookEventRow[]
}


export async function purgarVelhos(cutoffIso: string): Promise<number> {
  const { data, error } = await serverDb()
    .from('webhook_events')
    .delete()
    .in('status', ['done', 'dead', 'rejected'])
    .lt('received_at', cutoffIso)
    .select('id')
  if (error) throw new Error(`purgarVelhos: ${error.message}`)
  return (data ?? []).length
}


export async function requeueProcessingOrfaos(cutoffIso: string): Promise<number> {
  const { data, error } = await serverDb()
    .from('webhook_events')
    .update({ status: 'queued', claimed_at: null })
    .eq('status', 'processing')
    .lt('claimed_at', cutoffIso)
    .select('id')
  if (error) throw new Error(`requeueProcessingOrfaos: ${error.message}`)
  return (data ?? []).length
}
