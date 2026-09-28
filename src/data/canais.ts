import { serverDb } from '../server/supabase'

export type CanalTipo = 'whatsapp' | 'instagram'
export type CanalModo = 'supervisionado' | 'autonomo'
export type CanalProvider = 'whatsapp_cloud' | 'uazapi' | 'instagram'
export interface CanalRow {
  id: string; tipo: CanalTipo; external_id: string; rotulo: string
  agent_id: string; modo: CanalModo; enabled: boolean; config: Record<string, unknown>
  provider: CanalProvider; conexao_estado: string; conexao_qr: string | null
  created_at: string; updated_at: string
}

export async function createCanal(input: { tipo: CanalTipo; external_id: string; rotulo: string; agent_id: string; modo?: CanalModo; provider?: CanalProvider; config?: Record<string, unknown> }): Promise<CanalRow> {
  
  
  const { data, error } = await serverDb().from('canais').insert(input).select().single()
  if (error) throw new Error(`createCanal: ${error.message}`)
  return data as CanalRow
}
export async function getCanal(id: string): Promise<CanalRow | null> {
  const { data, error } = await serverDb().from('canais').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getCanal: ${error.message}`)
  return (data as CanalRow) ?? null
}
export async function getCanalByExternalId(externalId: string, provider?: CanalProvider): Promise<CanalRow | null> {
  let q = serverDb().from('canais').select().eq('external_id', externalId)
  
  
  if (provider) q = q.eq('provider', provider)
  const { data, error } = await q.maybeSingle()
  if (error) throw new Error(`getCanalByExternalId: ${error.message}`)
  return (data as CanalRow) ?? null
}
export async function listCanais(): Promise<CanalRow[]> {
  const { data, error } = await serverDb().from('canais').select().order('created_at', { ascending: true })
  if (error) throw new Error(`listCanais: ${error.message}`)
  return (data ?? []) as CanalRow[]
}



export async function updateCanal(id: string, patch: Partial<Pick<CanalRow, 'rotulo' | 'agent_id' | 'modo' | 'enabled' | 'external_id'>>): Promise<void> {
  const { error } = await serverDb().from('canais')
    .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`updateCanal: ${error.message}`)
}



export async function deleteCanal(id: string): Promise<void> {
  const { error } = await serverDb().from('canais').delete().eq('id', id)
  if (error) throw new Error(`deleteCanal: ${error.message}`)
}





export async function updateConexao(id: string, estado: string, qr?: string | null): Promise<void> {
  const { error } = await serverDb().from('canais')
    .update({ conexao_estado: estado, conexao_qr: qr ?? null, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`updateConexao: ${error.message}`)
}



export async function countCanaisDesconectados(): Promise<number> {
  const { count, error } = await serverDb().from('canais')
    .select('id', { count: 'exact', head: true }).eq('conexao_estado', 'desconectado')
  if (error) throw new Error(`countCanaisDesconectados: ${error.message}`)
  return count ?? 0
}



export async function algumModoTeste(): Promise<boolean> {
  const { count, error } = await serverDb().from('canais')
    .select('id', { count: 'exact', head: true }).eq('config->>modo_teste', 'true')
  if (error) throw new Error(`algumModoTeste: ${error.message}`)
  return (count ?? 0) > 0
}



export async function updateCanalConfig(id: string, patch: Record<string, unknown>): Promise<void> {
  const { data, error: readErr } = await serverDb().from('canais').select('config').eq('id', id).maybeSingle()
  if (readErr) throw new Error(`updateCanalConfig(read): ${readErr.message}`)
  if (!data) throw new Error(`updateCanalConfig: canal ${id} não encontrado`)
  const atual = ((data as { config: Record<string, unknown> | null }).config) ?? {}
  const { error } = await serverDb().from('canais')
    .update({ config: { ...atual, ...patch }, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`updateCanalConfig: ${error.message}`)
}
