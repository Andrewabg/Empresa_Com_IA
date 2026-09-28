

import { serverDb } from '@/server/supabase'

export const MAX_TENTATIVAS_ENVIO = 3

export type NotificacaoStatus = 'pendente' | 'enviando' | 'enviada' | 'agrupada_no_briefing' | 'suprimida' | 'falhou'
export interface NotificacaoRow {
  id: string; tipo: string; titulo: string; corpo: string
  urgencia: 'imediata' | 'briefing'; status: NotificacaoStatus
  payload: Record<string, unknown>; dedup_key: string | null
  tentativas: number; claimed_at: string | null; created_at: string; enviada_at: string | null
}
export interface InsertNotificacaoInput {
  tipo: string; titulo: string; corpo: string; urgencia: 'imediata' | 'briefing'
  payload?: Record<string, unknown>; dedupKey?: string
}


export async function insertNotificacao(input: InsertNotificacaoInput): Promise<{ created: boolean; row?: NotificacaoRow }> {
  const { data, error } = await serverDb().from('notificacoes').insert({
    tipo: input.tipo, titulo: input.titulo, corpo: input.corpo, urgencia: input.urgencia,
    payload: input.payload ?? {}, dedup_key: input.dedupKey ?? null,
  }).select().single()
  if (error) {
    if (error.code === '23505') return { created: false }
    throw new Error(`insertNotificacao: ${error.message}`)
  }
  return { created: true, row: data as NotificacaoRow }
}

export interface ListPendentesOpts {
  limit?: number
  
  ordem?: 'asc' | 'desc'
}

export async function listPendentes(opts: ListPendentesOpts = {}): Promise<NotificacaoRow[]> {
  const { limit = 50, ordem = 'asc' } = opts
  const { data, error } = await serverDb().from('notificacoes')
    .select().eq('status', 'pendente').order('created_at', { ascending: ordem === 'asc' }).limit(limit)
  if (error) throw new Error(`listPendentes: ${error.message}`)
  return (data ?? []) as NotificacaoRow[]
}


export async function listTiposPendentes(limit = 500): Promise<string[]> {
  const { data, error } = await serverDb().from('notificacoes')
    .select('tipo').eq('status', 'pendente').order('created_at', { ascending: true }).limit(limit)
  if (error) throw new Error(`listTiposPendentes: ${error.message}`)
  return (data ?? []).map((r) => (r as { tipo: string }).tipo)
}


export async function contarPendentes(): Promise<number> {
  const { count, error } = await serverDb().from('notificacoes')
    .select('id', { count: 'exact', head: true }).eq('status', 'pendente')
  if (error) throw new Error(`contarPendentes: ${error.message}`)
  return count ?? 0
}


export async function claimNotificacao(id: string): Promise<NotificacaoRow | null> {
  const { data, error } = await serverDb().from('notificacoes')
    .update({ status: 'enviando', claimed_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'pendente').select()
  if (error) throw new Error(`claimNotificacao: ${error.message}`)
  return data && data.length === 1 ? (data[0] as NotificacaoRow) : null
}

export async function marcarEnviada(id: string): Promise<boolean> {
  const { data, error } = await serverDb().from('notificacoes')
    .update({ status: 'enviada', enviada_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'enviando').select('id')
  if (error) throw new Error(`marcarEnviada: ${error.message}`)
  return (data ?? []).length === 1
}


export async function falhouOuRequeue(id: string, tentativas: number): Promise<void> {
  const terminal = tentativas >= MAX_TENTATIVAS_ENVIO
  const { error } = await serverDb().from('notificacoes')
    .update({
      status: terminal ? 'falhou' : 'pendente', tentativas, claimed_at: null,
      ...(terminal ? { dedup_key: null } : {}),
    })
    .eq('id', id).eq('status', 'enviando')
  if (error) throw new Error(`falhouOuRequeue: ${error.message}`)
}


export async function marcarStatus(id: string, status: 'suprimida' | 'agrupada_no_briefing'): Promise<boolean> {
  const { data, error } = await serverDb().from('notificacoes')
    .update({ status }).eq('id', id).eq('status', 'enviando').select('id')
  if (error) throw new Error(`marcarStatus: ${error.message}`)
  return (data ?? []).length === 1
}


export async function listColdEnviando(cutoffIso: string): Promise<NotificacaoRow[]> {
  const { data, error } = await serverDb().from('notificacoes')
    .select().eq('status', 'enviando').lt('claimed_at', cutoffIso)
  if (error) throw new Error(`listColdEnviando: ${error.message}`)
  return (data ?? []) as NotificacaoRow[]
}


export async function podarNotificacoesVelhas(cutoffIso: string): Promise<number> {
  const { data, error } = await serverDb().from('notificacoes')
    .delete()
    .in('status', ['enviada', 'agrupada_no_briefing', 'suprimida', 'falhou'])
    .lt('created_at', cutoffIso)
    .select('id')
  if (error) throw new Error(`podarNotificacoesVelhas: ${error.message}`)
  return (data ?? []).length
}
