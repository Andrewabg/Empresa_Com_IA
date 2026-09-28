
import { serverDb } from '@/server/supabase'
import { diaAncoraDe, type Recorrencia } from '@/lib/proativo/recorrencia'

export interface LembreteRow {
  id: string; texto: string; due_at: string
  recorrencia: Recorrencia | null; status: 'agendado' | 'disparado' | 'cancelado'; created_at: string
  
  dia_ancora?: number | null
  
  contexto?: string | null
  
  conversation_id?: string | null
  
  termina_em?: string | null
}

export async function criarLembrete(i: {
  texto: string; dueAt: string; recorrencia?: Recorrencia
  contexto?: string | null; conversationId?: string | null
  
  terminaEm?: string | null
}): Promise<LembreteRow> {
  const { data, error } = await serverDb().from('lembretes')
    
    
    
    
    .insert({
      texto: i.texto, due_at: i.dueAt, recorrencia: i.recorrencia ?? null,
      dia_ancora: diaAncoraDe(i.dueAt),
      
      termina_em: i.recorrencia ? (i.terminaEm || null) : null,
      contexto: i.contexto ?? null, conversation_id: i.conversationId ?? null,
    }).select().single()
  if (error) throw new Error(`criarLembrete: ${error.message}`)
  return data as LembreteRow
}

export async function listarAtivos(): Promise<LembreteRow[]> {
  const { data, error } = await serverDb().from('lembretes')
    .select().eq('status', 'agendado').order('due_at', { ascending: true })
  if (error) throw new Error(`listarAtivos: ${error.message}`)
  return (data ?? []) as LembreteRow[]
}


export async function cancelarLembrete(id: string): Promise<boolean> {
  const { data, error } = await serverDb().from('lembretes')
    .update({ status: 'cancelado' }).eq('id', id).eq('status', 'agendado').select('id')
  if (error) throw new Error(`cancelarLembrete: ${error.message}`)
  return (data ?? []).length === 1
}


export async function adiarLembrete(id: string, dueAt: string): Promise<LembreteRow | null> {
  const { data, error } = await serverDb().from('lembretes')
    .update({ due_at: dueAt }).eq('id', id).eq('status', 'agendado').select()
  if (error) throw new Error(`adiarLembrete: ${error.message}`)
  const linhas = (data ?? []) as LembreteRow[]
  return linhas.length === 1 ? linhas[0] : null
}

export async function listVencidos(corteIso: string): Promise<LembreteRow[]> {
  const { data, error } = await serverDb().from('lembretes')
    .select().eq('status', 'agendado').lte('due_at', corteIso).order('due_at', { ascending: true })
  if (error) throw new Error(`listVencidos: ${error.message}`)
  return (data ?? []) as LembreteRow[]
}

export async function marcarDisparado(id: string): Promise<void> {
  const { error } = await serverDb().from('lembretes').update({ status: 'disparado' }).eq('id', id).eq('status', 'agendado')
  if (error) throw new Error(`marcarDisparado: ${error.message}`)
}


export async function reagendar(id: string, novoDueAt: string): Promise<void> {
  const { error } = await serverDb().from('lembretes').update({ due_at: novoDueAt }).eq('id', id).eq('status', 'agendado')
  if (error) throw new Error(`reagendar: ${error.message}`)
}


export async function podarLembretesVelhos(cutoffIso: string): Promise<number> {
  const { data, error } = await serverDb().from('lembretes')
    .delete()
    .in('status', ['disparado', 'cancelado'])
    .lt('created_at', cutoffIso)
    .select('id')
  if (error) throw new Error(`podarLembretesVelhos: ${error.message}`)
  return (data ?? []).length
}
