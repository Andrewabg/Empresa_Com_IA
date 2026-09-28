

import { serverDb } from '@/server/supabase'
import { getSetting, setSetting } from '@/data/settings'
import type { PersonaCampos } from '@/lib/treino/persona'

export interface TreinoCaso {
  id: string; agent_id: string; canal_id: string | null; conversa_id: string | null; mensagem_id: string | null
  origem: 'marcado' | 'escalacao' | 'auto' | 'cliente'
  estimulo: { mensagens: { role: 'user' | 'assistant'; content: string }[]; ficha: unknown; agora: string }
  resposta_dada: string | null; sinal: string
  status: 'aberto' | 'corrigido' | 'ignorado'
  criterio: string | null; estavel: boolean
  created_at: string; updated_at: string; corrigido_at: string | null
}

export interface TreinoCorrecao {
  id: string; caso_id: string; agent_id: string; gaveta: 'base' | 'diretriz' | 'persona' | 'playbook' | 'regra'
  ref_tabela: string | null; ref_id: string | null; conteudo: string; ativo: boolean; created_at: string
}

const REGRESSAO_KEY = 'treino_regressao_pendente'

export async function inserirCaso(input: Omit<TreinoCaso, 'id' | 'status' | 'criterio' | 'estavel' | 'created_at' | 'updated_at' | 'corrigido_at'>): Promise<string> {
  const { data, error } = await serverDb().from('treino_casos').insert(input).select('id').single()
  if (error) throw new Error(`inserirCaso: ${error.message}`)
  return (data as { id: string }).id
}

export async function listarCasos(agentId: string): Promise<TreinoCaso[]> {
  const { data, error } = await serverDb()
    .from('treino_casos')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listarCasos: ${error.message}`)
  return (data ?? []) as TreinoCaso[]
}

export async function getCaso(id: string): Promise<TreinoCaso | null> {
  const { data, error } = await serverDb()
    .from('treino_casos')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getCaso: ${error.message}`)
  return (data as TreinoCaso | null) ?? null
}

export async function listarTestes(agentId: string): Promise<TreinoCaso[]> {
  const { data, error } = await serverDb()
    .from('treino_casos')
    .select('*')
    .eq('agent_id', agentId)
    .not('criterio', 'is', null)
    .eq('status', 'corrigido')
  if (error) throw new Error(`listarTestes: ${error.message}`)
  return (data ?? []) as TreinoCaso[]
}

export async function marcarCorrigido(id: string, criterio: string, at: string): Promise<void> {
  const { error } = await serverDb()
    .from('treino_casos')
    .update({ status: 'corrigido', criterio, corrigido_at: at, updated_at: at })
    .eq('id', id)
  if (error) throw new Error(`marcarCorrigido: ${error.message}`)
}

export async function marcarInstavel(id: string, estavel: boolean): Promise<void> {
  const { error } = await serverDb()
    .from('treino_casos')
    .update({ estavel, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`marcarInstavel: ${error.message}`)
}

export async function ignorarCaso(id: string): Promise<void> {
  const { error } = await serverDb()
    .from('treino_casos')
    .update({ status: 'ignorado', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`ignorarCaso: ${error.message}`)
}

export async function inserirCorrecao(input: Omit<TreinoCorrecao, 'id' | 'ativo' | 'created_at'>): Promise<string> {
  const { data, error } = await serverDb()
    .from('treino_correcoes')
    .insert(input)
    .select('id')
    .single()
  if (error) throw new Error(`inserirCorrecao: ${error.message}`)
  return (data as { id: string }).id
}

export async function listarCorrecoes(casoId: string): Promise<TreinoCorrecao[]> {
  const { data, error } = await serverDb()
    .from('treino_correcoes')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listarCorrecoes: ${error.message}`)
  return (data ?? []) as TreinoCorrecao[]
}

export async function getCorrecao(id: string): Promise<TreinoCorrecao | null> {
  const { data, error } = await serverDb()
    .from('treino_correcoes')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getCorrecao: ${error.message}`)
  return (data as TreinoCorrecao | null) ?? null
}

export async function setCorrecaoAtiva(id: string, ativo: boolean): Promise<void> {
  const { error } = await serverDb()
    .from('treino_correcoes')
    .update({ ativo })
    .eq('id', id)
  if (error) throw new Error(`setCorrecaoAtiva: ${error.message}`)
}

export async function listarCorrecoesAtivas(agentId: string): Promise<TreinoCorrecao[]> {
  const { data, error } = await serverDb()
    .from('treino_correcoes')
    .select('*')
    .eq('agent_id', agentId)
    .eq('ativo', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listarCorrecoesAtivas: ${error.message}`)
  return (data ?? []) as TreinoCorrecao[]
}

export async function getPersonaCampos(agentId: string): Promise<PersonaCampos> {
  const { data, error } = await serverDb().from('atendente_persona').select('campos').eq('agent_id', agentId).maybeSingle()
  if (error) throw new Error(`getPersonaCampos: ${error.message}`)
  return ((data?.campos as PersonaCampos) ?? {})
}

export async function setPersonaCampos(agentId: string, campos: PersonaCampos): Promise<void> {
  const { error } = await serverDb().from('atendente_persona')
    .upsert({ agent_id: agentId, campos, updated_at: new Date().toISOString() }, { onConflict: 'agent_id' })
  if (error) throw new Error(`setPersonaCampos: ${error.message}`)
}


export async function listarAgentesComRegrasOuro(): Promise<string[]> {
  const { data, error } = await serverDb()
    .from('atendente_persona')
    .select('agent_id, campos')
    .order('updated_at', { ascending: true })
  if (error) throw new Error(`listarAgentesComRegrasOuro: ${error.message}`)
  return ((data ?? []) as { agent_id: string; campos: PersonaCampos | null }[])
    .filter((r) => Array.isArray(r.campos?.regras_de_ouro) && r.campos!.regras_de_ouro!.length > 0)
    .map((r) => r.agent_id)
}

export async function enfileirarRegressao(agentId: string): Promise<void> {
  const raw = await getSetting(REGRESSAO_KEY)
  let ids: string[] = []
  try { ids = raw ? (JSON.parse(raw) as string[]) : [] } catch { ids = [] }
  if (!Array.isArray(ids)) ids = []
  if (!ids.includes(agentId)) ids = [...ids, agentId]
  await setSetting(REGRESSAO_KEY, JSON.stringify(ids))
}

export async function drenarRegressaoPendente(): Promise<string[]> {
  const raw = await getSetting(REGRESSAO_KEY)
  let ids: string[] = []
  try { ids = raw ? (JSON.parse(raw) as string[]) : [] } catch { ids = [] }
  if (!Array.isArray(ids)) ids = []
  await setSetting(REGRESSAO_KEY, JSON.stringify([]))
  return ids
}
