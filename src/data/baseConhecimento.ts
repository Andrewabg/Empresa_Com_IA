

import type { SupabaseClient } from '@supabase/supabase-js'
import { serverDb } from '../server/supabase'

export interface EntradaBaseRow {
  id: string; agent_id: string | null; titulo: string; conteudo: string
  tipo: 'fato' | 'playbook'; enabled: boolean; origem: 'operador' | 'aprendizado'; created_at: string; updated_at: string
}
export interface ResultadoBusca { id: string; titulo: string; conteudo: string; tipo: 'fato' | 'playbook'; score: number; similarity?: number | null }

export async function upsertEntradaBase(input: {
  id?: string; titulo: string; conteudo: string; agent_id: string | null
  embedding: number[]; tipo?: 'fato' | 'playbook'; enabled?: boolean; origem?: 'operador' | 'aprendizado'
  
  embeddingVersion?: string | null
}): Promise<EntradaBaseRow> {
  if (!input.embedding?.length) throw new Error('upsertEntradaBase: embedding vazio')
  const db = serverDb()
  const emb = '[' + input.embedding.join(',') + ']' 
  
  
  
  const row = {
    titulo: input.titulo, conteudo: input.conteudo, agent_id: input.agent_id,
    embedding: emb,
    ...(input.embeddingVersion !== undefined ? { embedding_version: input.embeddingVersion } : {}),
    ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.origem !== undefined ? { origem: input.origem } : {}),
    updated_at: new Date().toISOString(),
  }
  const q = input.id
    ? db.from('base_conhecimento').update(row).eq('id', input.id).select('id, agent_id, titulo, conteudo, tipo, enabled, origem, created_at, updated_at').single()
    : db.from('base_conhecimento').insert(row).select('id, agent_id, titulo, conteudo, tipo, enabled, origem, created_at, updated_at').single()
  const { data, error } = await q
  if (error) throw new Error(`upsertEntradaBase: ${error.message}`)
  return data as EntradaBaseRow
}


export interface BaseReembedRow { id: string; titulo: string; conteudo: string }


export async function listBaseNeedingReembed(
  db: SupabaseClient, currentVersion: string, limit: number, afterId?: string | null,
): Promise<BaseReembedRow[]> {
  let q = db
    .from('base_conhecimento')
    .select('id, titulo, conteudo')
    
    .or(`embedding_version.is.null,embedding_version.neq.${currentVersion}`)
    .not('embedding', 'is', null)   
    .order('id', { ascending: true })
    .limit(limit)
  if (afterId) q = q.gt('id', afterId)
  const { data, error } = await q
  if (error) throw new Error(`listBaseNeedingReembed: ${error.message}`)
  return (data ?? []) as BaseReembedRow[]
}


export async function updateBaseEmbedding(
  db: SupabaseClient, id: string, embedding: number[], version: string,
): Promise<void> {
  if (!embedding?.length) throw new Error('updateBaseEmbedding: embedding vazio')
  const { error } = await db
    .from('base_conhecimento')
    .update({ embedding: '[' + embedding.join(',') + ']', embedding_version: version })
    .eq('id', id)
  if (error) throw new Error(`updateBaseEmbedding: ${error.message}`)
}

export async function setEntradaEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await serverDb().from('base_conhecimento').update({ enabled }).eq('id', id)
  if (error) throw new Error(`setEntradaEnabled: ${error.message}`)
}
export async function listBase(): Promise<EntradaBaseRow[]> {
  const { data, error } = await serverDb().from('base_conhecimento')
    .select('id, agent_id, titulo, conteudo, tipo, enabled, origem, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`listBase: ${error.message}`)
  return (data ?? []) as EntradaBaseRow[]
}

export async function listBaseByAgent(agentId: string): Promise<EntradaBaseRow[]> {
  const { data, error } = await serverDb().from('base_conhecimento')
    .select('id, agent_id, titulo, conteudo, tipo, enabled, origem, created_at, updated_at')
    .or(`agent_id.is.null,agent_id.eq.${agentId}`)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`listBaseByAgent: ${error.message}`)
  return (data ?? []) as EntradaBaseRow[]
}
export async function deleteEntradaBase(id: string): Promise<void> {
  const { error } = await serverDb().from('base_conhecimento').delete().eq('id', id)
  if (error) throw new Error(`deleteEntradaBase: ${error.message}`)
}

export async function buscarEntradasPorEntidade(
  entity: string, agentId: string, limit = 8,
): Promise<Pick<EntradaBaseRow, 'id' | 'titulo' | 'conteudo' | 'tipo'>[]> {
  const { data, error } = await serverDb().from('base_conhecimento')
    .select('id, titulo, conteudo, tipo')
    .eq('enabled', true)
    .or(`agent_id.is.null,agent_id.eq.${agentId}`)
    .textSearch('fts', entity, { type: 'websearch', config: 'portuguese' })
    .limit(limit)
  if (error) throw new Error(`buscarEntradasPorEntidade "${entity}": ${error.message}`)
  return (data ?? []) as Pick<EntradaBaseRow, 'id' | 'titulo' | 'conteudo' | 'tipo'>[]
}




export async function replaceChunksEntrada(
  entradaId: string,
  chunks: Array<{ ordem: number; texto: string; embedding: number[] }>,
): Promise<void> {
  const db = serverDb()
  const { error: delErr } = await db.from('base_conhecimento_chunks').delete().eq('entrada_id', entradaId)
  if (delErr) throw new Error(`replaceChunksEntrada(delete): ${delErr.message}`)
  if (chunks.length === 0) return
  const rows = chunks.map((c) => ({
    entrada_id: entradaId, ordem: c.ordem, texto: c.texto,
    embedding: '[' + c.embedding.join(',') + ']', 
  }))
  const { error } = await db.from('base_conhecimento_chunks').insert(rows)
  if (error) throw new Error(`replaceChunksEntrada(insert): ${error.message}`)
}


export async function listEntradasSemChunk(
  limit = 50, minChars = 1200,
): Promise<BaseReembedRow[]> {
  const { data, error } = await serverDb().rpc('base_conhecimento_sem_chunk', {
    p_limit: limit, p_min_chars: minChars,
  })
  if (error) throw new Error(`listEntradasSemChunk: ${error.message}`)
  return (data ?? []) as BaseReembedRow[]
}


export async function searchBase(input: { pergunta: string; embedding: number[]; agentId: string; k?: number; tipo?: 'fato' | 'playbook' }): Promise<ResultadoBusca[]> {
  const { data, error } = await serverDb().rpc('base_conhecimento_search', {
    query_embedding: input.embedding, query_text: input.pergunta,
    match_count: input.k ?? 5, p_agent_id: input.agentId, p_tipo: input.tipo ?? null,
  })
  if (error) throw new Error(`searchBase: ${error.message}`)
  return (data ?? []) as ResultadoBusca[]
}
