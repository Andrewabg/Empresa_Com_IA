import { serverDb } from '../server/supabase'
import type { FichaJuridica } from '@/lib/juridico/ficha'


export async function getFichaJuridica(operatorId: string): Promise<FichaJuridica> {
  const { data, error } = await serverDb().from('ficha_juridica')
    .select('perfil, aprendizados').eq('operator_id', operatorId).maybeSingle()
  if (error) throw new Error(`getFichaJuridica: ${error.message}`)
  if (!data) return { aprendizados: [] }
  const perfil = (data.perfil ?? {}) as Omit<FichaJuridica, 'aprendizados'>
  return { ...perfil, aprendizados: (data.aprendizados ?? []) as FichaJuridica['aprendizados'] }
}


export async function upsertFichaJuridica(operatorId: string, ficha: FichaJuridica): Promise<void> {
  const { aprendizados, ...perfil } = ficha
  const { error } = await serverDb().from('ficha_juridica')
    .upsert({ operator_id: operatorId, perfil, aprendizados, updated_at: new Date().toISOString() }, { onConflict: 'operator_id' })
  if (error) throw new Error(`upsertFichaJuridica: ${error.message}`)
}
