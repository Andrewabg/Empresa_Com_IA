import { serverDb } from '../server/supabase'
import { elegivelParaReflexao, REFLECT_COOLDOWN_MS } from '@/lib/memory-reflect'

export interface Conversation {
  id: string
  operator_id: string | null
  title: string | null
  title_provisional?: boolean
  created_at: string
  updated_at: string
  reflected_at?: string | null
  agent_id?: string | null
  
  preview?: string | null
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string | null
  tool_payload: unknown | null
  created_at: string
}

export async function createConversation(
  operatorId?: string,
  title?: string,
): Promise<Conversation> {
  const db = serverDb()
  const { data, error } = await db
    .from('conversations')
    .insert({ operator_id: operatorId ?? null, title: title ?? null })
    .select()
    .single()
  if (error) throw new Error(`createConversation: ${error.message}`)
  return data as Conversation
}


export async function ensureConversation(
  operatorId: string,
  conversationId?: string | null,
): Promise<Conversation> {
  if (conversationId) {
    const existing = await getConversationForOperator(conversationId, operatorId)
    if (existing) return existing
  }
  return createConversation(operatorId)
}

export async function appendMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  toolPayload?: unknown,
): Promise<Message> {
  const db = serverDb()
  const { data, error } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      tool_payload: toolPayload ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(`appendMessage: ${error.message}`)

  
  const { error: touchError } = await db
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (touchError) throw new Error(`appendMessage (touch updated_at): ${touchError.message}`)

  return data as Message
}


export async function truncarMensagemOuvida(
  messageId: string,
  operatorId: string,
  textoOuvido: string,
): Promise<boolean> {
  const db = serverDb()
  
  
  
  
  const { data: msg, error: erroLeitura } = await db
    .from('messages')
    .select('id, content, tool_payload, conversations!inner(operator_id)')
    .eq('id', messageId)
    .eq('role', 'assistant')
    .eq('conversations.operator_id', operatorId)
    .maybeSingle()
  if (erroLeitura || !msg) return false

  const completo = String(msg.content ?? '')
  const ouvido = textoOuvido.trim()
  
  if (!ouvido || ouvido.length >= completo.length || !completo.startsWith(ouvido)) return false

  const payload = (msg.tool_payload ?? {}) as Record<string, unknown>
  const { error } = await db
    .from('messages')
    .update({
      content: ouvido,
      tool_payload: { ...payload, interrompido: true, texto_completo: completo },
    })
    .eq('id', messageId)
  return !error
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const db = serverDb()
  const { data, error } = await db
    .from('messages')
    .select()
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    
    
    
    
    .order('id', { ascending: true })
  if (error) throw new Error(`listMessages: ${error.message}`)
  return (data ?? []) as Message[]
}


export type RecentMessage = Omit<Message, 'tool_payload'> & { socorro?: boolean | null }


const COLUNAS_ENXUTAS = 'id, conversation_id, role, content, created_at, socorro:tool_payload->socorro'


export async function listRecentMessages(conversationId: string, n: number): Promise<RecentMessage[]> {
  const db = serverDb()
  const { data, error } = await db
    .from('messages')
    .select(COLUNAS_ENXUTAS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }) 
    .limit(n)
  if (error) throw new Error(`listRecentMessages: ${error.message}`)
  return ((data ?? []) as RecentMessage[]).reverse()
}


export async function listFirstMessages(conversationId: string, n: number): Promise<RecentMessage[]> {
  const db = serverDb()
  const { data, error } = await db
    .from('messages')
    .select(COLUNAS_ENXUTAS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true }) 
    .limit(n)
  if (error) throw new Error(`listFirstMessages: ${error.message}`)
  return (data ?? []) as RecentMessage[]
}


export interface AchadoNoTranscript {
  message_id: string
  conversation_id: string
  conversa_titulo: string | null
  role: 'user' | 'assistant'
  content: string
  created_at: string
  
  snippet: string
  score: number
}


export async function buscarNoTranscript(input: {
  operatorId: string
  agentId: string
  query: string
  limite?: number
  conversationId?: string | null
  excluirIds?: string[] | null
}): Promise<AchadoNoTranscript[]> {
  const { data, error } = await serverDb().rpc('messages_search', {
    p_operator_id: input.operatorId,
    p_agent_id: input.agentId,
    query_text: input.query,
    match_count: input.limite ?? 6,
    p_conversation_id: input.conversationId ?? null,
    p_excluir_ids: input.excluirIds && input.excluirIds.length > 0 ? input.excluirIds : null,
  })
  if (error) throw new Error(`buscarNoTranscript: ${error.message}`)
  return (data ?? []) as AchadoNoTranscript[]
}


export interface VizinhaDoAchado {
  message_id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  e_o_hit: boolean
  
  socorro: boolean
}


export async function janelaDoAchado(input: {
  operatorId: string
  agentId: string
  messageId: string
  raio?: number
}): Promise<VizinhaDoAchado[]> {
  const { data, error } = await serverDb().rpc('messages_window', {
    p_operator_id: input.operatorId,
    p_agent_id: input.agentId,
    p_message_id: input.messageId,
    p_radius: input.raio ?? 2,
  })
  if (error) throw new Error(`janelaDoAchado: ${error.message}`)
  return (data ?? []) as VizinhaDoAchado[]
}


export interface AnexoDaConversa {
  
  id: string
  
  kind: string
  
  title: string
  
  bytes: number
  
  summary: string | null
}


const MSGS_COM_ANEXO_PADRAO = 5


function anexosDoPayload(payload: unknown): Omit<AnexoDaConversa, 'summary'>[] {
  if (!payload || typeof payload !== 'object') return []
  const lista = (payload as { anexos?: unknown }).anexos
  if (!Array.isArray(lista)) return []
  const saida: Omit<AnexoDaConversa, 'summary'>[] = []
  for (const bruto of lista) {
    if (!bruto || typeof bruto !== 'object') continue
    const item = bruto as Record<string, unknown>
    if (typeof item.id !== 'string' || item.id.length === 0) continue
    saida.push({
      id: item.id,
      kind: typeof item.kind === 'string' ? item.kind : 'documento',
      title: typeof item.title === 'string' && item.title ? item.title : 'arquivo',
      bytes: typeof item.bytes === 'number' ? item.bytes : 0,
    })
  }
  return saida
}


export async function listAnexosDaConversa(
  conversationId: string,
  limit = MSGS_COM_ANEXO_PADRAO,
): Promise<AnexoDaConversa[]> {
  const db = serverDb()
  const { data, error } = await db
    .from('messages')
    .select('id, tool_payload')
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .not('tool_payload->anexos', 'is', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }) 
    .limit(limit)
  if (error) throw new Error(`listAnexosDaConversa: ${error.message}`)

  const vistos = new Set<string>()
  const anexos: Omit<AnexoDaConversa, 'summary'>[] = []
  for (const linha of (data ?? []) as { tool_payload: unknown }[]) {
    for (const anexo of anexosDoPayload(linha.tool_payload)) {
      if (vistos.has(anexo.id)) continue 
      vistos.add(anexo.id)
      anexos.push(anexo)
    }
  }
  if (anexos.length === 0) return []

  const { data: resumos, error: erroResumo } = await db
    .from('artifacts')
    .select('id, summary')
    .eq('conversation_id', conversationId)
    .in('id', anexos.map((a) => a.id))
  if (erroResumo) throw new Error(`listAnexosDaConversa (resumos): ${erroResumo.message}`)

  const porId = new Map(
    ((resumos ?? []) as { id: string; summary: string | null }[]).map((r) => [r.id, r.summary]),
  )
  return anexos.map((a) => ({ ...a, summary: porId.get(a.id) ?? null }))
}


export async function getConversationForOperator(
  conversationId: string,
  operatorId: string,
): Promise<Conversation | null> {
  const db = serverDb()
  const { data, error } = await db
    .from('conversations')
    .select()
    .eq('id', conversationId)
    .eq('operator_id', operatorId)
    .maybeSingle()
  if (error) throw new Error(`getConversationForOperator: ${error.message}`)
  return (data as Conversation | null) ?? null
}


export async function latestConversation(operatorId: string): Promise<Conversation | null> {
  const db = serverDb()
  const { data, error } = await db
    .from('conversations')
    .select()
    .eq('operator_id', operatorId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`latestConversation: ${error.message}`)
  return (data as Conversation | null) ?? null
}


export async function getConversationForReflect(
  conversationId: string,
): Promise<{ operator_id: string | null; reflected_at: string | null; title: string | null; title_provisional: boolean } | null> {
  const { data, error } = await serverDb()
    .from('conversations')
    .select('operator_id, reflected_at, title, title_provisional')
    .eq('id', conversationId)
    .maybeSingle()
  if (error) throw new Error(`getConversationForReflect: ${error.message}`)
  if (!data) return null
  return {
    operator_id: (data.operator_id as string | null) ?? null,
    reflected_at: (data.reflected_at as string | null) ?? null,
    title: (data.title as string | null) ?? null,
    title_provisional: (data.title_provisional as boolean | null) ?? false,
  }
}


export async function getConversationOperator(conversationId: string): Promise<string | null> {
  const { data, error } = await serverDb()
    .from('conversations')
    .select('operator_id')
    .eq('id', conversationId)
    .maybeSingle()
  if (error) throw new Error(`getConversationOperator: ${error.message}`)
  return data?.operator_id ?? null
}


export async function roomConversation(operatorId: string, agentId: string): Promise<Conversation> {
  const db = serverDb()
  
  const { data: naoVazia, error: nvErr } = await db
    .from('conversations')
    .select('*, messages!inner(id)')
    .eq('operator_id', operatorId)
    .eq('agent_id', agentId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .limit(1, { referencedTable: 'messages' })
    .maybeSingle()
  if (nvErr) throw new Error(`roomConversation: ${nvErr.message}`)
  if (naoVazia) return stripEmbeddedMessages(naoVazia)

  
  const { data, error } = await db
    .from('conversations')
    .select()
    .eq('operator_id', operatorId)
    .eq('agent_id', agentId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`roomConversation: ${error.message}`)
  if (data) return data as Conversation

  
  const { data: created, error: insErr } = await db
    .from('conversations')
    .insert({ operator_id: operatorId, agent_id: agentId })
    .select()
    .single()
  if (insErr) throw new Error(`roomConversation insert: ${insErr.message}`)
  return created as Conversation
}


function stripEmbeddedMessages(row: Record<string, unknown>): Conversation {
  const { messages: _messages, ...conversation } = row
  void _messages
  return conversation as unknown as Conversation
}


export async function createRoomConversation(
  operatorId: string,
  agentId: string,
  title?: string,
  provisional = false,
): Promise<Conversation> {
  const db = serverDb()
  const { data, error } = await db
    .from('conversations')
    .insert({ operator_id: operatorId, agent_id: agentId, title: title || null, title_provisional: provisional })
    .select()
    .single()
  if (error) throw new Error(`createRoomConversation: ${error.message}`)
  return data as Conversation
}


export async function listRoomThreads(operatorId: string, agentId: string, limit = 60): Promise<Conversation[]> {
  
  
  const { data, error } = await serverDb().rpc('conversations_list', {
    p_operator_id: operatorId,
    p_agent_id: agentId,
    match_count: limit,
  })
  if (error) throw new Error(`listRoomThreads: ${error.message}`)
  return (data ?? []) as Conversation[]
}


export interface ThreadSearchRow {
  id: string
  title: string | null
  updated_at: string
  snippet: string | null
  score: number
}


export async function searchThreads(
  operatorId: string,
  agentId: string,
  query: string,
  opts?: { since?: string; until?: string; limit?: number },
): Promise<ThreadSearchRow[]> {
  const { data, error } = await serverDb().rpc('conversations_search', {
    p_operator_id: operatorId,
    p_agent_id: agentId,
    query_text: query,
    match_count: opts?.limit ?? 30,
    p_since: opts?.since ?? null,
    p_until: opts?.until ?? null,
  })
  if (error) throw new Error(`searchThreads: ${error.message}`)
  return (data ?? []) as ThreadSearchRow[]
}


export async function renameConversation(id: string, operatorId: string, title: string): Promise<void> {
  const { error } = await serverDb()
    .from('conversations')
    .update({ title, title_provisional: false })
    .eq('id', id)
    .eq('operator_id', operatorId)
  if (error) throw new Error(`renameConversation: ${error.message}`)
}


export async function setConversationTitle(id: string, title: string): Promise<void> {
  const { error } = await serverDb()
    .from('conversations')
    .update({ title, title_provisional: false })
    .eq('id', id)
  if (error) throw new Error(`setConversationTitle: ${error.message}`)
}


export async function latestRoom(operatorId: string): Promise<Conversation | null> {
  const db = serverDb()
  
  const { data: naoVazia, error: nvErr } = await db
    .from('conversations')
    .select('*, messages!inner(id)')
    .eq('operator_id', operatorId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .limit(1, { referencedTable: 'messages' })
    .maybeSingle()
  if (nvErr) throw new Error(`latestRoom: ${nvErr.message}`)
  if (naoVazia) return stripEmbeddedMessages(naoVazia)

  
  
  const { data, error } = await db
    .from('conversations')
    .select()
    .eq('operator_id', operatorId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`latestRoom: ${error.message}`)
  return (data as Conversation | null) ?? null
}


export async function markReflected(conversationId: string): Promise<void> {
  const { error } = await serverDb()
    .from('conversations')
    .update({ reflected_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) throw new Error(`markReflected: ${error.message}`)
}


export async function listAtivasLongasSemReflexao(
  cutoffIso: string,
  minMsgs: number,
  limit = 25,
): Promise<Conversation[]> {
  const { data, error } = await serverDb()
    .from('conversations')
    .select('id, operator_id, title, created_at, updated_at, reflected_at')
    .gte('updated_at', cutoffIso)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listAtivasLongasSemReflexao: ${error.message}`)

  const out: Conversation[] = []
  for (const c of (data ?? []) as Conversation[]) {
    try {
      let q = serverDb()
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
      
      if (c.reflected_at) q = q.gt('created_at', c.reflected_at)
      const { count, error: erroContagem } = await q
      if (erroContagem) {
        console.warn('[listAtivasLongasSemReflexao] contagem fail-open:', c.id, erroContagem.message)
        continue
      }
      if ((count ?? 0) >= minMsgs) out.push(c)
    } catch (e) {
      console.warn('[listAtivasLongasSemReflexao] contagem fail-open:', c.id, e)
    }
  }
  return out
}


export async function listIdleUnreflected(
  cutoffIso: string,
  limit = 25,
  reflectCooldownMs = REFLECT_COOLDOWN_MS,
): Promise<Conversation[]> {
  const { data, error } = await serverDb()
    .from('conversations')
    .select('id, operator_id, title, created_at, updated_at, reflected_at')
    .lt('updated_at', cutoffIso)
    .order('reflected_at', { ascending: true, nullsFirst: true })
    .order('updated_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(`listIdleUnreflected: ${error.message}`)
  
  
  
  
  const nowIso = new Date().toISOString()
  return ((data ?? []) as Conversation[]).filter((c) =>
    elegivelParaReflexao(c.reflected_at, c.updated_at, nowIso, reflectCooldownMs),
  )
}
