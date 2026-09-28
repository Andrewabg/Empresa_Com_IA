


import { serverDb } from '@/server/supabase'
import type { LinhaDeSinal } from '@/lib/memory/sinalDeUso'
import type { AgregadoDeUso } from '@/lib/memory/promocaoPorUso'


export async function registrarUso(linhas: readonly LinhaDeSinal[]): Promise<number> {
  if (!linhas.length) return 0
  try {
    const { error } = await serverDb()
      .from('uso_da_memoria')
      .upsert(linhas as LinhaDeSinal[], {
        onConflict: 'alvo_tipo,alvo_id,dia,consulta_hash',
        ignoreDuplicates: true,
      })
    if (error) {
      console.warn('[sinalDeUso] registrarUso fail-open:', error.message)
      return 0
    }
    return linhas.length
  } catch (e) {
    console.warn('[sinalDeUso] registrarUso fail-open:', e)
    return 0
  }
}


export interface AgregarUsoOpts {
  origens: readonly string[]
  desdeIso: string
  minSinais: number
  minConsultas: number
  minDias: number
  limite: number
}


export async function agregarUsoPromovivel(opts: AgregarUsoOpts): Promise<AgregadoDeUso[]> {
  try {
    const { data, error } = await serverDb().rpc('uso_agregado_do_episodico', {
      p_origens: opts.origens,
      p_desde: opts.desdeIso,
      p_min_sinais: opts.minSinais,
      p_min_consultas: opts.minConsultas,
      p_min_dias: opts.minDias,
      p_limite: opts.limite,
    })
    if (error) {
      console.warn('[sinalDeUso] agregarUsoPromovivel fail-open:', error.message)
      return []
    }
    return (data ?? []) as AgregadoDeUso[]
  } catch (e) {
    console.warn('[sinalDeUso] agregarUsoPromovivel fail-open:', e)
    return []
  }
}


export async function podarSinalAntesDe(diaCorte: string): Promise<number> {
  try {
    const { data, error } = await serverDb()
      .from('uso_da_memoria')
      .delete()
      .lt('dia', diaCorte)
      .select('alvo_id')
    if (error) {
      console.warn('[sinalDeUso] podarSinalAntesDe fail-open:', error.message)
      return 0
    }
    return (data ?? []).length
  } catch (e) {
    console.warn('[sinalDeUso] podarSinalAntesDe fail-open:', e)
    return 0
  }
}
