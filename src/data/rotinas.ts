
import { serverDb } from '@/server/supabase'
import type { Frequencia, AgendaSpec } from '@/lib/rotinas/agenda'

export interface RotinaRow {
  id: string
  agent_id: string
  titulo: string
  pedido: string
  frequencia: Frequencia
  hora: string
  dia_semana: number | null
  dias_semana: number[] | null
  dia_mes: number | null
  
  termina_em: string | null
  ativa: boolean
  proxima_execucao: string
  ultima_execucao: string | null
  ultima_task_id: string | null
  created_at: string
  updated_at: string
}

export interface CriarRotinaInput {
  agentId: string
  titulo: string
  pedido: string
  agenda: AgendaSpec
  proximaExecucao: string
  ativa?: boolean
}


export function agendaDaRotina(r: RotinaRow): AgendaSpec {
  return {
    frequencia: r.frequencia, hora: r.hora, diaSemana: r.dia_semana,
    diasSemana: r.dias_semana, diaMes: r.dia_mes, terminaEm: r.termina_em,
  }
}

export async function criarRotina(i: CriarRotinaInput): Promise<RotinaRow> {
  const { data, error } = await serverDb().from('rotinas').insert({
    agent_id: i.agentId,
    titulo: i.titulo,
    pedido: i.pedido,
    frequencia: i.agenda.frequencia,
    hora: i.agenda.hora,
    dia_semana: i.agenda.diaSemana ?? null,
    dias_semana: i.agenda.diasSemana ?? null,
    dia_mes: i.agenda.diaMes ?? null,
    termina_em: i.agenda.terminaEm || null,
    proxima_execucao: i.proximaExecucao,
    ativa: i.ativa ?? true,
  }).select().single()
  if (error) throw new Error(`criarRotina: ${error.message}`)
  return data as RotinaRow
}

export async function listarRotinas(): Promise<RotinaRow[]> {
  const { data, error } = await serverDb().from('rotinas')
    .select().order('ativa', { ascending: false }).order('proxima_execucao', { ascending: true })
  if (error) throw new Error(`listarRotinas: ${error.message}`)
  return (data ?? []) as RotinaRow[]
}

export async function getRotina(id: string): Promise<RotinaRow | null> {
  const { data, error } = await serverDb().from('rotinas').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getRotina: ${error.message}`)
  return (data as RotinaRow | null) ?? null
}

export interface AtualizarRotinaPatch {
  titulo?: string
  pedido?: string
  agentId?: string
  agenda?: AgendaSpec
  ativa?: boolean
  
  proximaExecucao?: string
}

export async function atualizarRotina(id: string, patch: AtualizarRotinaPatch): Promise<RotinaRow> {
  
  const campos: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.titulo !== undefined) campos.titulo = patch.titulo
  if (patch.pedido !== undefined) campos.pedido = patch.pedido
  if (patch.agentId !== undefined) campos.agent_id = patch.agentId
  if (patch.ativa !== undefined) campos.ativa = patch.ativa
  if (patch.agenda !== undefined) {
    campos.frequencia = patch.agenda.frequencia
    campos.hora = patch.agenda.hora
    campos.dia_semana = patch.agenda.diaSemana ?? null
    campos.dias_semana = patch.agenda.diasSemana ?? null
    campos.dia_mes = patch.agenda.diaMes ?? null
    
    
    
    campos.termina_em = patch.agenda.terminaEm || null
  }
  if (patch.proximaExecucao !== undefined) campos.proxima_execucao = patch.proximaExecucao
  const { data, error } = await serverDb().from('rotinas').update(campos).eq('id', id).select().single()
  if (error) throw new Error(`atualizarRotina: ${error.message}`)
  return data as RotinaRow
}


export async function removerRotina(id: string): Promise<boolean> {
  const { data, error } = await serverDb().from('rotinas').delete().eq('id', id).select('id')
  if (error) throw new Error(`removerRotina: ${error.message}`)
  return (data ?? []).length === 1
}


export async function listarVencidas(agoraIso: string, limite = 20): Promise<RotinaRow[]> {
  const { data, error } = await serverDb().from('rotinas')
    .select().eq('ativa', true).lte('proxima_execucao', agoraIso)
    .order('proxima_execucao', { ascending: true }).limit(limite)
  if (error) throw new Error(`listarVencidas: ${error.message}`)
  return (data ?? []) as RotinaRow[]
}


export async function claimExecucao(
  id: string,
  proximaEsperada: string,
  novaProxima: string,
  agoraIso: string,
  encerrar = false,
): Promise<boolean> {
  
  
  
  const { data, error } = await serverDb().from('rotinas')
    .update({
      proxima_execucao: novaProxima, ultima_execucao: agoraIso, updated_at: agoraIso,
      ...(encerrar ? { ativa: false } : {}),
    })
    .eq('id', id).eq('proxima_execucao', proximaEsperada).eq('ativa', true)
    .select('id')
  if (error) throw new Error(`claimExecucao: ${error.message}`)
  return (data ?? []).length === 1
}


export async function encerrarRotina(id: string, agoraIso: string): Promise<boolean> {
  const { data, error } = await serverDb().from('rotinas')
    .update({ ativa: false, updated_at: agoraIso })
    .eq('id', id).eq('ativa', true).select('id')
  if (error) throw new Error(`encerrarRotina: ${error.message}`)
  return (data ?? []).length === 1
}


export async function registrarTask(id: string, taskId: string): Promise<void> {
  const { error } = await serverDb().from('rotinas').update({ ultima_task_id: taskId }).eq('id', id)
  if (error) throw new Error(`registrarTask: ${error.message}`)
}
