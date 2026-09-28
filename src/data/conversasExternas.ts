import { serverDb } from '../server/supabase'
import type { DossieHandoff } from '@/lib/canais/dossie'
import type { TermoDeBusca } from '@/lib/inbox/filtroConversas'

export type ConversaStatus = 'aberta' | 'aguardando_humano' | 'assumida' | 'fechada'
export interface ConversaExternaRow {
  id: string; canal_id: string; contato_id: string; status: ConversaStatus
  ultima_msg_in_at: string | null; ultima_msg_at: string | null; nao_lidas: number
  
  agent_id: string | null
  
  dossie: DossieHandoff | null
  
  proxima_acao: string | null
  proxima_acao_em: string | null
  
  toques: number
  created_at: string; updated_at: string
}


export async function getOrCreateConversaAberta(canalId: string, contatoId: string): Promise<ConversaExternaRow> {
  const db = serverDb()
  const { data: found, error: e1 } = await db.from('conversas_externas').select()
    .eq('canal_id', canalId).eq('contato_id', contatoId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (e1) throw new Error(`getOrCreateConversaAberta: ${e1.message}`)
  if (found) {
    if (found.status !== 'fechada') return found as ConversaExternaRow
    const { data: reaberta, error: e2 } = await db.from('conversas_externas')
      .update({ status: 'aberta', updated_at: new Date().toISOString() }).eq('id', found.id).select().single()
    if (e2) throw new Error(`getOrCreateConversaAberta (reabrir): ${e2.message}`)
    return reaberta as ConversaExternaRow
  }
  const { data, error } = await db.from('conversas_externas')
    .insert({ canal_id: canalId, contato_id: contatoId }).select().single()
  if (error) {
    if (error.code === '23505') return getOrCreateConversaAberta(canalId, contatoId)
    throw new Error(`getOrCreateConversaAberta: ${error.message}`)
  }
  return data as ConversaExternaRow
}

export async function getConversaAbertaDoPar(canalId: string, contatoId: string): Promise<ConversaExternaRow | null> {
  const { data, error } = await serverDb().from('conversas_externas').select()
    .eq('canal_id', canalId).eq('contato_id', contatoId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(`getConversaAbertaDoPar: ${error.message}`)
  return (data as ConversaExternaRow) ?? null
}
export async function getConversa(id: string): Promise<ConversaExternaRow | null> {
  const { data, error } = await serverDb().from('conversas_externas').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getConversa: ${error.message}`)
  return (data as ConversaExternaRow) ?? null
}
export async function setConversaStatus(id: string, status: ConversaStatus): Promise<void> {
  const { error } = await serverDb().from('conversas_externas')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`setConversaStatus: ${error.message}`)
}

export async function deleteConversa(id: string): Promise<void> {
  const { error } = await serverDb().from('conversas_externas').delete().eq('id', id)
  if (error) throw new Error(`deleteConversa: ${error.message}`)
}

export async function setConversaDossie(id: string, dossie: DossieHandoff): Promise<void> {
  const { error } = await serverDb().from('conversas_externas')
    .update({ dossie, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`setConversaDossie: ${error.message}`)
}

export async function setConversaAgente(id: string, agentId: string | null): Promise<void> {
  const { error } = await serverDb().from('conversas_externas')
    .update({ agent_id: agentId, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`setConversaAgente: ${error.message}`)
}

export async function touchConversaIn(id: string, atIso: string): Promise<void> {
  const db = serverDb()
  
  const { data, error: e1 } = await db.from('conversas_externas').select('nao_lidas').eq('id', id).single()
  if (e1) throw new Error(`touchConversaIn: ${e1.message}`)
  const { error } = await db.from('conversas_externas')
    .update({ ultima_msg_in_at: atIso, ultima_msg_at: atIso, nao_lidas: (data?.nao_lidas ?? 0) + 1, toques: 0, updated_at: atIso })
    .eq('id', id)
  if (error) throw new Error(`touchConversaIn: ${error.message}`)
}
export async function touchConversaOut(id: string, atIso: string): Promise<void> {
  const { error } = await serverDb().from('conversas_externas')
    .update({ ultima_msg_at: atIso, updated_at: atIso }).eq('id', id)
  if (error) throw new Error(`touchConversaOut: ${error.message}`)
}







export async function zerarNaoLidas(id: string): Promise<boolean> {
  const { data, error } = await serverDb().from('conversas_externas')
    .update({ nao_lidas: 0 }).eq('id', id).gt('nao_lidas', 0).select('id')
  if (error) throw new Error(`zerarNaoLidas: ${error.message}`)
  return (data ?? []).length > 0
}






export async function agendarProximaAcao(id: string, acao: string, emIso: string): Promise<void> {
  const { error } = await serverDb().from('conversas_externas')
    .update({ proxima_acao: acao, proxima_acao_em: emIso }).eq('id', id)
  if (error) throw new Error(`agendarProximaAcao: ${error.message}`)
}


export async function cancelarProximaAcao(id: string): Promise<void> {
  const { error } = await serverDb().from('conversas_externas')
    .update({ proxima_acao: null, proxima_acao_em: null })
    .eq('id', id).not('proxima_acao', 'is', null)
  if (error) throw new Error(`cancelarProximaAcao: ${error.message}`)
}


export async function claimToqueFollowup(id: string, acao: string, toquesAtuais: number): Promise<boolean> {
  const { data, error } = await serverDb().from('conversas_externas')
    .update({ proxima_acao: null, proxima_acao_em: null, toques: toquesAtuais + 1 })
    .eq('id', id).eq('proxima_acao', acao).select('id')
  if (error) throw new Error(`claimToqueFollowup: ${error.message}`)
  return (data ?? []).length === 1
}


export async function listConversasComAcaoVencida(agoraIso: string, limite = 50): Promise<ConversaExternaRow[]> {
  const { data, error } = await serverDb().from('conversas_externas').select()
    .not('proxima_acao', 'is', null).lte('proxima_acao_em', agoraIso)
    .order('proxima_acao_em', { ascending: true }).limit(limite)
  if (error) throw new Error(`listConversasComAcaoVencida: ${error.message}`)
  return (data ?? []) as ConversaExternaRow[]
}


export async function listConversasCandidatasFollowup(desdeIso: string, limite = 200): Promise<ConversaExternaRow[]> {
  const { data, error } = await serverDb().from('conversas_externas').select()
    .eq('status', 'aberta').is('proxima_acao', null).gte('ultima_msg_at', desdeIso)
    .order('ultima_msg_at', { ascending: false }).limit(limite)
  if (error) throw new Error(`listConversasCandidatasFollowup: ${error.message}`)
  return (data ?? []) as ConversaExternaRow[]
}


export type ConversaInboxRow = ConversaExternaRow & {
  contato: { id: string; nome: string; external_id: string }
  tem_rascunho: boolean
}


export async function countAguardandoHumano(): Promise<number> {
  const { count, error } = await serverDb().from('conversas_externas')
    .select('id', { count: 'exact', head: true }).eq('status', 'aguardando_humano')
  if (error) throw new Error(`countAguardandoHumano: ${error.message}`)
  return count ?? 0
}

export interface FiltroInbox {
  
  limite?: number
  
  desde?: number
  
  status?: ConversaStatus[] | null
  
  canalId?: string | null
  
  busca?: TermoDeBusca | null
}


export async function listConversasInbox(
  filtro: FiltroInbox = {},
): Promise<{ conversas: ConversaInboxRow[]; temMais: boolean }> {
  const db = serverDb()
  const limite = Math.max(1, filtro.limite ?? 50)
  const desde = Math.max(0, filtro.desde ?? 0)
  const busca = filtro.busca ?? null
  
  
  let q = db.from('conversas_externas')
    .select(`*, contato:contatos${busca ? '!inner' : ''}(id, nome, external_id)`)
  if (filtro.status && filtro.status.length > 0) q = q.in('status', filtro.status)
  if (filtro.canalId) q = q.eq('canal_id', filtro.canalId)
  if (busca) {
    const clausulas: string[] = []
    if (busca.texto) clausulas.push(`nome.ilike.*${busca.texto}*`)
    if (busca.digitos) clausulas.push(`external_id.ilike.*${busca.digitos}*`)
    q = q.or(clausulas.join(','), { referencedTable: 'contato' })
  }
  
  const { data, error } = await q
    .order('ultima_msg_at', { ascending: false, nullsFirst: false })
    .range(desde, desde + limite)
  if (error) throw new Error(`listConversasInbox: ${error.message}`)
  const todas = (data ?? []) as unknown as Array<Omit<ConversaInboxRow, 'tem_rascunho'>>
  const temMais = todas.length > limite
  const rows = temMais ? todas.slice(0, limite) : todas
  const ids = rows.map((r) => r.id)
  let comRascunho = new Set<string>()
  if (ids.length > 0) {
    const { data: rascunhos, error: e2 } = await db.from('mensagens_externas')
      .select('conversa_id').eq('status', 'rascunho').in('conversa_id', ids)
    if (e2) throw new Error(`listConversasInbox (rascunhos): ${e2.message}`)
    comRascunho = new Set((rascunhos ?? []).map((r) => r.conversa_id as string))
  }
  return { conversas: rows.map((r) => ({ ...r, tem_rascunho: comRascunho.has(r.id) })), temMais }
}
