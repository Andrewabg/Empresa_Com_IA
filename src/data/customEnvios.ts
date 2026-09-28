

import { serverDb } from '@/server/supabase'

export type CustomEnvioStatus = 'reservado' | 'enviado' | 'falhou'

export interface CustomEnvioRow {
  id: string
  dedup_key: string
  destino: string
  canal_id: string | null
  status: CustomEnvioStatus
  external_id: string | null
  erro: string | null
  created_at: string
  updated_at: string
}


export async function reservarEnvio(
  input: { dedupKey: string; destino: string; canalId: string | null },
): Promise<{ reservado: boolean; id?: string }> {
  const { data, error } = await serverDb()
    .from('custom_envios')
    .insert({ dedup_key: input.dedupKey, destino: input.destino, canal_id: input.canalId })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { reservado: false }
    throw new Error(`reservarEnvio: ${error.message}`)
  }
  return { reservado: true, id: data.id as string }
}


export async function concluirEnvio(id: string, externalId: string): Promise<void> {
  const { error } = await serverDb().from('custom_envios')
    .update({ status: 'enviado', external_id: externalId, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`concluirEnvio: ${error.message}`)
}


export async function falharEnvio(id: string, erro: string): Promise<void> {
  const { error } = await serverDb().from('custom_envios')
    .update({ status: 'falhou', erro, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`falharEnvio: ${error.message}`)
}

export async function getEnvioPorDedup(dedupKey: string): Promise<CustomEnvioRow | null> {
  const { data, error } = await serverDb().from('custom_envios')
    .select().eq('dedup_key', dedupKey).maybeSingle()
  if (error) throw new Error(`getEnvioPorDedup: ${error.message}`)
  return (data as CustomEnvioRow) ?? null
}


export async function anonimizarCustomEnviosVelhos(cutoffIso: string): Promise<number> {
  const { data, error } = await serverDb().from('custom_envios')
    .update({ destino: '', erro: null, external_id: null, updated_at: new Date().toISOString() })
    .lt('created_at', cutoffIso)
    .neq('destino', '')
    .select('id')
  if (error) throw new Error(`anonimizarCustomEnviosVelhos: ${error.message}`)
  return (data ?? []).length
}
