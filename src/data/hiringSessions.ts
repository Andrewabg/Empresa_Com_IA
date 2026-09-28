


import { serverDb } from '../server/supabase'
import { EMPTY_BRIEF } from '@/lib/hiring/brief'
import type { HiringBrief, HiringMode } from '@/lib/hiring/brief'

export type HiringStatus = 'em_andamento' | 'contratado' | 'abandonado'
export interface TranscriptMsg { role: 'user' | 'assistant'; content: string; at: string }

export interface HiringSessionRow {
  id: string
  status: HiringStatus
  mode: HiringMode
  agent_id: string | null
  brief: HiringBrief
  spec_draft: unknown | null
  candidato: unknown | null
  transcript: TranscriptMsg[]
  
  spec_gen_count: number
  created_at: string
  updated_at: string
}


function normalizeRow(row: Record<string, unknown>): HiringSessionRow {
  const rawBrief = (row.brief ?? {}) as Partial<HiringBrief>
  return {
    ...(row as unknown as HiringSessionRow),
    brief: {
      ferramentas: [],
      fronteiras: [],
      ...rawBrief,
    },
    transcript: (row.transcript as TranscriptMsg[] | null) ?? [],
    spec_gen_count: (row.spec_gen_count as number | null) ?? 0,
  }
}


export async function createSession(
  mode: HiringMode,
  agentId?: string | null,
): Promise<HiringSessionRow> {
  const db = serverDb()
  const insert: Record<string, unknown> = { mode, brief: EMPTY_BRIEF, transcript: [] }
  if (agentId) insert.agent_id = agentId

  
  
  
  
  
  
  
  
  const abandonarEInserir = async () => {
    const { error: errAbandon } = await db
      .from('hiring_sessions')
      .update({ status: 'abandonado', updated_at: new Date().toISOString() })
      .eq('status', 'em_andamento')
    if (errAbandon) throw new Error(`createSession (abandonar): ${errAbandon.message}`)

    const { data, error } = await db
      .from('hiring_sessions')
      .insert(insert)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data, error: null }
  }

  const MAX_TENTATIVAS = 4
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const { data, error } = await abandonarEInserir()
    if (!error) return normalizeRow(data as Record<string, unknown>)
    
    if (error.code === '23505') continue
    
    throw new Error(`createSession: ${error.message}`)
  }
  
  throw new Error(
    `createSession: convergência falhou após ${MAX_TENTATIVAS} tentativas (colisão persistente no índice 1-viva)`,
  )
}


export async function getSession(id: string): Promise<HiringSessionRow | null> {
  const { data, error } = await serverDb()
    .from('hiring_sessions')
    .select()
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getSession: ${error.message}`)
  return data ? normalizeRow(data as Record<string, unknown>) : null
}


export async function getSessionEmAndamento(): Promise<HiringSessionRow | null> {
  const { data, error } = await serverDb()
    .from('hiring_sessions')
    .select()
    .eq('status', 'em_andamento')
    .order('updated_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(`getSessionEmAndamento: ${error.message}`)
  const row = data?.[0]
  return row ? normalizeRow(row as Record<string, unknown>) : null
}


export async function patchBrief(id: string, brief: HiringBrief): Promise<void> {
  const { error } = await serverDb()
    .from('hiring_sessions')
    .update({ brief: brief as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`patchBrief: ${error.message}`)
}


export async function bumpSpecGen(id: string): Promise<void> {
  const db = serverDb()
  const { data: atual, error: errRead } = await db
    .from('hiring_sessions')
    .select('spec_gen_count')
    .eq('id', id)
    .single()
  if (errRead) throw new Error(`bumpSpecGen (read): ${errRead.message}`)
  const proximo = ((atual?.spec_gen_count as number | null) ?? 0) + 1
  const { error } = await db
    .from('hiring_sessions')
    .update({ spec_gen_count: proximo, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`bumpSpecGen (write): ${error.message}`)
}


export async function setSpecDraft(
  id: string,
  specDraft: unknown,
  candidato: unknown,
): Promise<void> {
  const { error } = await serverDb()
    .from('hiring_sessions')
    .update({
      spec_draft: specDraft as Record<string, unknown>,
      candidato: candidato as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(`setSpecDraft: ${error.message}`)
}


export async function appendTranscript(id: string, msgs: TranscriptMsg[]): Promise<void> {
  if (msgs.length === 0) return
  const db = serverDb()
  const { data: row, error: errRead } = await db
    .from('hiring_sessions')
    .select('transcript')
    .eq('id', id)
    .single()
  if (errRead) throw new Error(`appendTranscript (read): ${errRead.message}`)
  const atual: TranscriptMsg[] = (row?.transcript as TranscriptMsg[]) ?? []
  const { error } = await db
    .from('hiring_sessions')
    .update({ transcript: [...atual, ...msgs], updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`appendTranscript (write): ${error.message}`)
}


export async function finishSession(
  id: string,
  status: 'contratado' | 'abandonado',
  agentId?: string,
): Promise<void> {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (agentId) patch.agent_id = agentId
  const { error } = await serverDb()
    .from('hiring_sessions')
    .update(patch)
    .eq('id', id)
  if (error) throw new Error(`finishSession: ${error.message}`)
}


export async function claimSessionParaContratar(id: string): Promise<boolean> {
  const { data, error } = await serverDb()
    .from('hiring_sessions')
    .update({ status: 'contratado', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'em_andamento')
    .select('id')
  if (error) throw new Error(`claimSessionParaContratar: ${error.message}`)
  return Array.isArray(data) && data.length > 0
}


export async function purgeSessoesVelhas(dias = 30): Promise<void> {
  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await serverDb()
    .from('hiring_sessions')
    .delete()
    .in('status', ['abandonado', 'contratado'])
    .lt('updated_at', corte)
  if (error) throw new Error(`purgeSessoesVelhas: ${error.message}`)
}
