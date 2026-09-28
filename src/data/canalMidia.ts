

import { serverDb } from '../server/supabase'

export interface CanalMidiaRow {
  id: string
  canal_id: string
  slug: string
  rotulo: string
  descricao: string
  storage_bucket: string
  storage_path: string
  mime: string
  bytes: number
  enabled: boolean
  created_at: string
  updated_at: string
}


export async function listCanalMidia(canalId: string, apenasAtivas = false): Promise<CanalMidiaRow[]> {
  let q = serverDb().from('canal_midia_publica').select().eq('canal_id', canalId)
  if (apenasAtivas) q = q.eq('enabled', true)
  const { data, error } = await q.order('created_at', { ascending: true })
  if (error) throw new Error(`listCanalMidia: ${error.message}`)
  return (data ?? []) as CanalMidiaRow[]
}


export async function getCanalMidiaBySlug(canalId: string, slug: string, apenasAtivas = false): Promise<CanalMidiaRow | null> {
  let q = serverDb().from('canal_midia_publica').select().eq('canal_id', canalId).eq('slug', slug)
  if (apenasAtivas) q = q.eq('enabled', true)
  const { data, error } = await q.maybeSingle()
  if (error) throw new Error(`getCanalMidiaBySlug: ${error.message}`)
  return (data as CanalMidiaRow) ?? null
}

export async function upsertCanalMidia(
  input: Omit<CanalMidiaRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<CanalMidiaRow> {
  const { data, error } = await serverDb().from('canal_midia_publica')
    .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: 'canal_id,slug' })
    .select().single()
  if (error) throw new Error(`upsertCanalMidia: ${error.message}`)
  return data as CanalMidiaRow
}

export async function setCanalMidiaEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await serverDb().from('canal_midia_publica')
    .update({ enabled, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`setCanalMidiaEnabled: ${error.message}`)
}


export async function deleteCanalMidia(id: string): Promise<{ storage_bucket: string; storage_path: string } | null> {
  const { data, error } = await serverDb().from('canal_midia_publica')
    .delete().eq('id', id).select('storage_bucket, storage_path').maybeSingle()
  if (error) throw new Error(`deleteCanalMidia: ${error.message}`)
  return (data as { storage_bucket: string; storage_path: string }) ?? null
}
