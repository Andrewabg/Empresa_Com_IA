import { serverDb } from '../server/supabase'
import type { BrandVoice } from '@/lib/estudio/brandVoice'
import { EMPTY_BRAND_VOICE } from '@/lib/estudio/brandVoice'
import { EMPTY_DIRECAO_ARTE, type DirecaoArte } from '@/lib/design/direcaoArte'


export async function getBrandVoice(operatorId: string, brandId: string): Promise<BrandVoice> {
  const { data, error } = await serverDb().from('brand_memory')
    .select('dna, voz_mae, dialetos, aprendizados')
    .eq('operator_id', operatorId).eq('brand_id', brandId).maybeSingle()
  if (error) throw new Error(`getBrandVoice: ${error.message}`)
  if (!data) return EMPTY_BRAND_VOICE
  return {
    dna: (data.dna ?? {}) as BrandVoice['dna'],
    voz_mae: (data.voz_mae ?? {}) as BrandVoice['voz_mae'],
    dialetos: (data.dialetos ?? {}) as BrandVoice['dialetos'],
    aprendizados: (data.aprendizados ?? []) as BrandVoice['aprendizados'],
  }
}


export async function getDirecaoArte(operatorId: string, brandId: string): Promise<DirecaoArte> {
  const { data, error } = await serverDb().from('brand_memory')
    .select('direcao_arte')
    .eq('operator_id', operatorId).eq('brand_id', brandId).maybeSingle()
  if (error) throw new Error(`getDirecaoArte: ${error.message}`)
  const d = (data?.direcao_arte ?? {}) as Partial<DirecaoArte>
  return { ...EMPTY_DIRECAO_ARTE, ...d, aprendizados: d.aprendizados ?? [] } as DirecaoArte
}


export async function upsertDirecaoArte(operatorId: string, brandId: string, direcao: DirecaoArte): Promise<void> {
  const { error } = await serverDb().from('brand_memory').upsert({
    operator_id: operatorId, brand_id: brandId,
    direcao_arte: direcao, updated_at: new Date().toISOString(),
  }, { onConflict: 'operator_id,brand_id' })
  if (error) throw new Error(`upsertDirecaoArte: ${error.message}`)
}


export async function upsertBrandVoice(operatorId: string, brandId: string, voice: BrandVoice): Promise<void> {
  const { error } = await serverDb().from('brand_memory').upsert({
    operator_id: operatorId, brand_id: brandId,
    dna: voice.dna, voz_mae: voice.voz_mae, dialetos: voice.dialetos,
    aprendizados: voice.aprendizados, updated_at: new Date().toISOString(),
  }, { onConflict: 'operator_id,brand_id' })
  if (error) throw new Error(`upsertBrandVoice: ${error.message}`)
}
