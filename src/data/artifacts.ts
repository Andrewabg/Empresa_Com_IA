import { serverDb } from '../server/supabase'
import type { ArtifactKind } from '../lib/artifacts'

export interface ArtifactRow {
  id: string
  conversation_id: string | null
  task_id: string | null
  agent_id: string
  kind: ArtifactKind
  title: string
  content: string | null
  storage_ref: string | null
  summary: string | null
  status: string
  version: number
  parent_id: string | null
  created_at: string
}

export interface CreateArtifactInput {
  conversation_id?: string | null
  task_id?: string | null
  agent_id: string
  kind: ArtifactKind
  title: string
  content?: string | null
  storage_ref?: string | null
  summary?: string | null
  parent_id?: string | null
}


export async function createArtifact(input: CreateArtifactInput): Promise<ArtifactRow> {
  const { data, error } = await serverDb()
    .from('artifacts')
    .insert({
      conversation_id: input.conversation_id ?? null,
      task_id: input.task_id ?? null,
      agent_id: input.agent_id,
      kind: input.kind,
      title: input.title,
      content: input.content ?? null,
      storage_ref: input.storage_ref ?? null,
      summary: input.summary ?? null,
      parent_id: input.parent_id ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(`createArtifact: ${error.message}`)
  return data as ArtifactRow
}


export async function getArtifact(id: string): Promise<ArtifactRow | null> {
  const { data, error } = await serverDb()
    .from('artifacts')
    .select()
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getArtifact: ${error.message}`)
  return (data as ArtifactRow | null) ?? null
}


export async function getArtifactByStorageRef(
  conversationId: string,
  storageRef: string,
): Promise<ArtifactRow | null> {
  const { data, error } = await serverDb()
    .from('artifacts')
    .select()
    .eq('conversation_id', conversationId)
    .eq('storage_ref', storageRef)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true }) 
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`getArtifactByStorageRef: ${error.message}`)
  return (data as ArtifactRow | null) ?? null
}

export interface MoverArtifactArgs {
  artifactId: string
  
  operatorId: string
  
  agentId: string
  
  paraConversaId: string
}


export async function moverArtifactParaConversa(args: MoverArtifactArgs): Promise<boolean> {
  const db = serverDb()
  const [alvo, destino] = await Promise.all([
    db
      .from('artifacts')
      .select('id, conversation_id, conversations!inner(operator_id, agent_id)')
      .eq('id', args.artifactId)
      .eq('conversations.operator_id', args.operatorId)
      .eq('conversations.agent_id', args.agentId)
      .limit(1)
      .maybeSingle(),
    db
      .from('conversations')
      .select('id')
      .eq('id', args.paraConversaId)
      .eq('operator_id', args.operatorId)
      .maybeSingle(),
  ])
  if (alvo.error) throw new Error(`moverArtifactParaConversa (origem): ${alvo.error.message}`)
  if (destino.error) throw new Error(`moverArtifactParaConversa (destino): ${destino.error.message}`)
  if (!alvo.data || !destino.data) return false

  const deConversaId = (alvo.data as { conversation_id: string | null }).conversation_id
  if (!deConversaId) return false
  if (deConversaId === args.paraConversaId) return true

  const { data: movidos, error } = await db
    .from('artifacts')
    .update({ conversation_id: args.paraConversaId })
    .eq('id', args.artifactId)
    .eq('conversation_id', deConversaId)
    .select('id')
  if (error) throw new Error(`moverArtifactParaConversa (update): ${error.message}`)
  return ((movidos ?? []) as { id: string }[]).length > 0
}

export async function listArtifactsByConversation(conversationId: string): Promise<ArtifactRow[]> {
  const { data, error } = await serverDb()
    .from('artifacts')
    .select()
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listArtifactsByConversation: ${error.message}`)
  return (data ?? []) as ArtifactRow[]
}

export async function listArtifactsByTask(taskId: string): Promise<ArtifactRow[]> {
  const { data, error } = await serverDb()
    .from('artifacts')
    .select()
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listArtifactsByTask: ${error.message}`)
  return (data ?? []) as ArtifactRow[]
}


export async function listArtifactsByPlan(planId: string): Promise<ArtifactRow[]> {
  const { data: tasks, error: e1 } = await serverDb().from('tasks').select('id').eq('plan_id', planId)
  if (e1) throw new Error(`listArtifactsByPlan(tasks): ${e1.message}`)
  const ids = (tasks ?? []).map((t) => t.id as string)
  if (!ids.length) return []
  const { data, error } = await serverDb().from('artifacts').select().in('task_id', ids).order('created_at', { ascending: true })
  if (error) throw new Error(`listArtifactsByPlan(artifacts): ${error.message}`)
  return (data ?? []) as ArtifactRow[]
}


export async function listArtifactIdsByConversation(conversationId: string): Promise<string[]> {
  const { data, error } = await serverDb()
    .from('artifacts')
    .select('id')
    .eq('conversation_id', conversationId)
  if (error) throw new Error(`listArtifactIdsByConversation: ${error.message}`)
  return (data ?? []).map((r) => r.id as string)
}


export async function listReferenciasByConversation(conversationId: string): Promise<ArtifactRow[]> {
  const { data, error } = await serverDb()
    .from('artifacts')
    .select()
    .eq('conversation_id', conversationId)
    .eq('kind', 'imagem')
    .like('storage_ref', 'referencias/%')
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) throw new Error(`listReferenciasByConversation: ${error.message}`)
  return (data ?? []) as ArtifactRow[]
}


export async function listArtifactsByAgent(agentId: string, limit = 12): Promise<ArtifactRow[]> {
  const { data, error } = await serverDb()
    .from('artifacts')
    .select()
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listArtifactsByAgent: ${error.message}`)
  return (data ?? []) as ArtifactRow[]
}


export async function listStorageRefsByIds(ids: string[]): Promise<{ id: string; storage_ref: string | null }[]> {
  if (!ids.length) return []
  const { data, error } = await serverDb().from('artifacts').select('id, storage_ref').in('id', ids)
  if (error) throw new Error(`listStorageRefsByIds: ${error.message}`)
  return (data ?? []) as { id: string; storage_ref: string | null }[]
}
