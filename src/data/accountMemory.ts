import { serverDb } from '../server/supabase'
import type { AccountMemory } from '@/lib/trafego/accountMemory'


export async function getAccountMemory(operatorId: string, accountId: string): Promise<AccountMemory> {
  const { data, error } = await serverDb()
    .from('account_memory')
    .select('perfil, aprendizados')
    .eq('operator_id', operatorId)
    .eq('account_id', accountId)
    .maybeSingle()
  if (error) throw new Error(`getAccountMemory: ${error.message}`)
  if (!data) return { perfil: {}, aprendizados: [] }
  return { perfil: (data.perfil ?? {}) as AccountMemory['perfil'], aprendizados: (data.aprendizados ?? []) as AccountMemory['aprendizados'] }
}


export async function upsertAccountMemory(operatorId: string, accountId: string, mem: AccountMemory): Promise<void> {
  const { error } = await serverDb()
    .from('account_memory')
    .upsert({ operator_id: operatorId, account_id: accountId, perfil: mem.perfil, aprendizados: mem.aprendizados, updated_at: new Date().toISOString() }, { onConflict: 'operator_id,account_id' })
  if (error) throw new Error(`upsertAccountMemory: ${error.message}`)
}


export async function getLatestAccountMemory(operatorId: string): Promise<{ accountId: string; mem: AccountMemory } | null> {
  const { data, error } = await serverDb()
    .from('account_memory')
    .select('account_id, perfil, aprendizados')
    .eq('operator_id', operatorId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`getLatestAccountMemory: ${error.message}`)
  if (!data) return null
  return { accountId: data.account_id as string, mem: { perfil: (data.perfil ?? {}) as AccountMemory['perfil'], aprendizados: (data.aprendizados ?? []) as AccountMemory['aprendizados'] } }
}
