import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrigemEpisodico } from '@/lib/memory/origemDoEpisodico'


export interface EpisodicRow {
  id: string
  conversation_id: string | null
  summary: string
  tags: string[]
  importance: number
  created_at: string
  last_accessed: string | null
}


export interface EpisodicHit {
  id: string
  conversation_id: string | null
  summary: string
  tags: string[]
  created_at: string
  distance: number
}

export interface InsertEpisodicInput {
  conversation_id: string | null
  summary: string
  embedding: number[]
  tags?: string[]
  agentId?: string | null   
  
  embeddingVersion?: string | null
  
  originClass?: OrigemEpisodico | null
}


export async function insertEpisodic(db: SupabaseClient, input: InsertEpisodicInput): Promise<EpisodicRow> {
  
  
  if (!input.embedding?.length) throw new Error('insertEpisodic: embedding vazio')
  const { data, error } = await db
    .from('episodic_memory')
    .insert({
      conversation_id: input.conversation_id,
      summary: input.summary,
      embedding: '[' + input.embedding.join(',') + ']',
      tags: input.tags ?? [],
      agent_id: input.agentId ?? null,   
      embedding_version: input.embeddingVersion ?? null,   
      origin_class: input.originClass ?? null,             
    })
    .select('id, conversation_id, summary, tags, importance, created_at, last_accessed')
    .single()
  if (error) throw new Error(`insertEpisodic: ${error.message}`)
  return data as EpisodicRow
}


export interface EpisodicReembedRow { id: string; summary: string }


export async function listEpisodicNeedingReembed(
  db: SupabaseClient, currentVersion: string, limit: number, afterId?: string | null,
): Promise<EpisodicReembedRow[]> {
  let q = db
    .from('episodic_memory')
    .select('id, summary')
    
    .or(`embedding_version.is.null,embedding_version.neq.${currentVersion}`)
    .not('embedding', 'is', null)   
    .order('id', { ascending: true })
    .limit(limit)
  if (afterId) q = q.gt('id', afterId)
  const { data, error } = await q
  if (error) throw new Error(`listEpisodicNeedingReembed: ${error.message}`)
  return (data ?? []) as EpisodicReembedRow[]
}


export async function updateEpisodicEmbedding(
  db: SupabaseClient, id: string, embedding: number[], version: string,
): Promise<void> {
  if (!embedding?.length) throw new Error('updateEpisodicEmbedding: embedding vazio')
  const { error } = await db
    .from('episodic_memory')
    .update({ embedding: '[' + embedding.join(',') + ']', embedding_version: version })
    .eq('id', id)
  if (error) throw new Error(`updateEpisodicEmbedding: ${error.message}`)
}


export async function searchEpisodic(
  db: SupabaseClient, embedding: number[], k: number, agentId?: string | null,
): Promise<EpisodicHit[]> {
  const { data, error } = await db.rpc('episodic_search', {
    query_embedding: embedding, match_count: k, p_agent_id: agentId ?? null,
  })
  if (error) throw new Error(`searchEpisodic: ${error.message}`)
  return (data ?? []) as EpisodicHit[]
}


export async function touchEpisodicAccessed(db: SupabaseClient, ids: string[]): Promise<void> {
  if (!ids.length) return
  const { error } = await db
    .from('episodic_memory')
    .update({ last_accessed: new Date().toISOString() })
    .in('id', ids)
  if (error) throw new Error(`touchEpisodicAccessed: ${error.message}`)
}


export async function latestEpisodicSummary(db: SupabaseClient, conversationId: string): Promise<string | null> {
  const { data, error } = await db
    .from('episodic_memory')
    .select('summary')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('latestEpisodicSummary: ' + error.message)
  return (data?.summary as string | undefined) ?? null
}


export async function listEpisodicByAgent(db: SupabaseClient, agentId: string, limit = 10): Promise<EpisodicRow[]> {
  const { data, error } = await db
    .from('episodic_memory')
    .select('id, conversation_id, summary, tags, importance, created_at, last_accessed')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listEpisodicByAgent: ${error.message}`)
  return (data ?? []) as EpisodicRow[]
}


export async function listEpisodicSince(
  db: SupabaseClient,
  sinceIso: string,
  limit?: number,
  ordem: 'recentes' | 'antigos' = 'recentes',
): Promise<EpisodicRow[]> {
  const ascendente = ordem === 'antigos'
  let q = db
    .from('episodic_memory')
    .select('id, conversation_id, summary, tags, importance, created_at, last_accessed')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: ascendente })
    .order('id', { ascending: ascendente })
  if (limit !== undefined) q = q.limit(limit)
  const { data, error } = await q
  if (error) throw new Error(`listEpisodicSince: ${error.message}`)
  return (data ?? []) as EpisodicRow[]
}


export async function pruneEpisodicOlderThan(db: SupabaseClient, cutoffIso: string): Promise<void> {
  const { error } = await db
    .from('episodic_memory')
    .delete()
    .or(`last_accessed.lt.${cutoffIso},and(last_accessed.is.null,created_at.lt.${cutoffIso})`)
  if (error) throw new Error(`pruneEpisodicOlderThan: ${error.message}`)
}


export async function pruneOperatorEpisodicOlderThan(db: SupabaseClient, cutoffIso: string): Promise<void> {
  const { error } = await db
    .from('episodic_memory')
    .delete()
    .is('agent_id', null)
    .or(`last_accessed.lt.${cutoffIso},and(last_accessed.is.null,created_at.lt.${cutoffIso})`)
  if (error) throw new Error(`pruneOperatorEpisodicOlderThan: ${error.message}`)
}
