import { serverDb } from '../server/supabase'
import type { CanalTipo } from './canais'
import type { FichaContato } from '@/lib/canais/ficha'
import { nomeAGravar } from '@/lib/canais/nomeDoContato'
import { variantesDeTelefone } from '@/lib/canais/telefone'


export type ContatoTipo = CanalTipo

export interface ContatoRow {
  id: string; tipo: ContatoTipo; external_id: string; nome: string
  ficha: FichaContato; created_at: string; updated_at: string
}


async function contatoComNomeAtualizado(
  existente: ContatoRow, nomeNovo: string, nomeProprio: string | null | undefined,
): Promise<ContatoRow> {
  const nome = nomeAGravar(existente.nome ?? '', nomeNovo, nomeProprio)
  if (nome === null) return existente
  const { error } = await serverDb().from('contatos')
    .update({ nome, updated_at: new Date().toISOString() }).eq('id', existente.id)
  if (error) throw new Error(`contatoComNomeAtualizado: ${error.message}`)
  return { ...existente, nome }
}


export async function getOrCreateContato(
  input: { tipo: ContatoTipo; external_id: string; nome: string; nomeProprio?: string | null },
): Promise<ContatoRow> {
  const db = serverDb()
  const { nomeProprio, ...linha } = input
  const { data: found, error: e1 } = await db.from('contatos').select()
    .eq('tipo', linha.tipo).eq('external_id', linha.external_id).maybeSingle()
  if (e1) throw new Error(`getOrCreateContato: ${e1.message}`)
  if (found) return contatoComNomeAtualizado(found as ContatoRow, linha.nome, nomeProprio)
  const { data, error } = await db.from('contatos').insert(linha).select().single()
  if (error) {
    if (error.code === '23505') return getOrCreateContato(input) 
    throw new Error(`getOrCreateContato: ${error.message}`)
  }
  return data as ContatoRow
}

export async function getContatoPorExternalId(tipo: ContatoTipo, externalId: string): Promise<ContatoRow | null> {
  const linhas = await listContatosPorExternalId(tipo, externalId)
  return linhas.find((c) => c.external_id === externalId) ?? linhas[0] ?? null
}

export async function getOrCreateContatoTolerante(
  input: { tipo: ContatoTipo; external_id: string; nome: string; nomeProprio?: string | null },
): Promise<ContatoRow> {
  const existente = await getContatoPorExternalId(input.tipo, input.external_id)
  if (!existente) return getOrCreateContato(input)
  return contatoComNomeAtualizado(existente, input.nome, input.nomeProprio)
}

export async function listContatosPorExternalId(tipo: ContatoTipo, externalId: string): Promise<ContatoRow[]> {
  const formas = tipo === 'whatsapp' ? variantesDeTelefone(externalId) : [externalId]
  const { data, error } = await serverDb().from('contatos').select()
    .eq('tipo', tipo).in('external_id', formas)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listContatosPorExternalId: ${error.message}`)
  return (data ?? []) as ContatoRow[]
}
export async function getContato(id: string): Promise<ContatoRow | null> {
  const { data, error } = await serverDb().from('contatos').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getContato: ${error.message}`)
  return (data as ContatoRow) ?? null
}
export async function updateFichaContato(id: string, ficha: FichaContato): Promise<void> {
  const { error } = await serverDb().from('contatos')
    .update({ ficha, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`updateFichaContato: ${error.message}`)
}
