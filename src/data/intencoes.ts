

import { serverDb } from '@/server/supabase'
import type { EstadoIntencao, ModoCasamento } from '@/lib/vigilancia/intencaoPermanente'

export type FonteIntencao = 'atendimento' | 'tarefa' | 'cerebro'

export interface IntencaoRow {
  id: string
  agent_id: string
  operator_id: string | null
  descricao: string
  fonte: FonteIntencao
  palavras: string[]
  modo_casamento: ModoCasamento
  estado: EstadoIntencao
  disparos: number
  max_disparos: number
  ultimo_disparo_em: string | null
  expira_em: string | null
  created_at: string
  updated_at: string
}

export interface CriarIntencaoInput {
  agentId: string
  operatorId?: string | null
  descricao: string
  fonte: FonteIntencao
  palavras: string[]
  modoCasamento?: ModoCasamento
  
  expiraEm: string | null
}

export async function criarIntencao(i: CriarIntencaoInput): Promise<IntencaoRow> {
  const { data, error } = await serverDb().from('intencoes_permanentes').insert({
    agent_id: i.agentId,
    operator_id: i.operatorId ?? null,
    descricao: i.descricao,
    fonte: i.fonte,
    palavras: i.palavras,
    modo_casamento: i.modoCasamento ?? 'contem',
    expira_em: i.expiraEm,
  }).select().single()
  if (error) throw new Error(`criarIntencao: ${error.message}`)
  return data as IntencaoRow
}


export async function listarAtivas(fonte: FonteIntencao): Promise<IntencaoRow[]> {
  const { data, error } = await serverDb().from('intencoes_permanentes')
    .select().eq('fonte', fonte).eq('estado', 'ativa')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listarAtivas: ${error.message}`)
  return (data ?? []) as IntencaoRow[]
}


export async function listarTodas(): Promise<IntencaoRow[]> {
  const { data, error } = await serverDb().from('intencoes_permanentes')
    .select().order('created_at', { ascending: false })
  if (error) throw new Error(`listarTodas: ${error.message}`)
  return (data ?? []) as IntencaoRow[]
}


export async function cancelarIntencao(id: string): Promise<boolean> {
  const { data, error } = await serverDb().from('intencoes_permanentes')
    .update({ estado: 'cancelada', updated_at: new Date().toISOString() })
    .eq('id', id).neq('estado', 'cancelada').select('id')
  if (error) throw new Error(`cancelarIntencao: ${error.message}`)
  return (data ?? []).length === 1
}


export async function marcarExpirada(id: string): Promise<void> {
  const { error } = await serverDb().from('intencoes_permanentes')
    .update({ estado: 'expirada', updated_at: new Date().toISOString() })
    .eq('id', id).eq('estado', 'ativa')
  if (error) throw new Error(`marcarExpirada: ${error.message}`)
}


export async function registrarDisparo(
  id: string, disparosEsperados: number, novoEstado: EstadoIntencao, agoraIso: string,
): Promise<boolean> {
  const { data, error } = await serverDb().from('intencoes_permanentes')
    .update({ disparos: disparosEsperados + 1, estado: novoEstado, ultimo_disparo_em: agoraIso, updated_at: agoraIso })
    .eq('id', id).eq('disparos', disparosEsperados).eq('estado', 'ativa')
    .select('id')
  if (error) throw new Error(`registrarDisparo: ${error.message}`)
  return (data ?? []).length === 1
}
