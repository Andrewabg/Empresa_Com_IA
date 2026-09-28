
import { getDefaultBrand as getBrandImpl } from '@/data/brands'
import { getBrandVoice as getVoiceImpl, upsertBrandVoice as upsertVoiceImpl } from '@/data/brandVoice'
import { mergeBrandVoice, type BrandVoicePatch, type BrandLearning } from '@/lib/estudio/brandVoice'
import { espelharVozNoCerebro } from './espelhoCerebro'

export interface AtualizarFichaCtx { operatorId?: string }
export interface AtualizarFichaDeps {
  getDefaultBrand?: typeof getBrandImpl
  getBrandVoice?: typeof getVoiceImpl
  upsertBrandVoice?: typeof upsertVoiceImpl
  espelhar?: typeof espelharVozNoCerebro
  now?: () => string
  origem?: BrandLearning['origem']
}

export async function atualizarFichaMarca(
  input: { patch: BrandVoicePatch }, ctx: AtualizarFichaCtx, deps: AtualizarFichaDeps = {},
): Promise<{ ok: boolean; message: string }> {
  if (!ctx.operatorId) return { ok: false, message: 'Sem operador no contexto.' }
  const getBrand = deps.getDefaultBrand ?? getBrandImpl
  const getVoice = deps.getBrandVoice ?? getVoiceImpl
  const upsert = deps.upsertBrandVoice ?? upsertVoiceImpl
  const espelhar = deps.espelhar ?? espelharVozNoCerebro
  const now = deps.now ?? (() => new Date().toISOString())
  const origem = deps.origem ?? 'operador'

  const brand = await getBrand(ctx.operatorId)
  if (!brand) return { ok: false, message: 'Ainda não conheço a marca — vamos fazer a entrevista primeiro.' }

  const atual = await getVoice(ctx.operatorId, brand.id)
  const next = mergeBrandVoice(atual, input.patch, { origem, at: now() })
  await upsert(ctx.operatorId, brand.id, next)
  try { await espelhar({ slug: brand.slug, nomeMarca: brand.nome, voice: next }) } catch {  }

  return { ok: true, message: 'Anotei na ficha da marca.' }
}
