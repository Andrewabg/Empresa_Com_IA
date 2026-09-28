
import { getSetting } from '@/data/settings'
import { ensureDefaultBrand as ensureBrandImpl } from '@/data/brands'
import {
  getDirecaoArte as getDirecaoArteImpl,
  upsertDirecaoArte as upsertDirecaoArteImpl,
} from '@/data/brandVoice'
import { mergeDirecaoArte, type DirecaoArtePatch } from '@/lib/design/direcaoArte'
import type { EstudioPatch } from '@/lib/estudio/types'

export interface AtualizarDirecaoArteInput {
  regra?: string
  estilo?: string
  mood?: string
  iluminacao?: string
  composicao?: string
  assinatura?: string
  proibicao?: string
  cores?: { nome: string; hex: string }[]
}
export interface AtualizarDirecaoArteCtx { operatorId?: string; actingAgentId?: string }
export interface AtualizarDirecaoArteResult { output: string; patch: EstudioPatch | null }

export interface AtualizarDirecaoArteDeps {
  getCompanyName?: () => Promise<string | null>
  ensureDefaultBrand?: typeof ensureBrandImpl
  getDirecaoArte?: typeof getDirecaoArteImpl
  upsertDirecaoArte?: typeof upsertDirecaoArteImpl
  now?: () => string
}

function isEmpty(input: AtualizarDirecaoArteInput): boolean {
  return !input.regra?.trim() && !input.estilo?.trim() && !input.mood?.trim() &&
    !input.iluminacao?.trim() && !input.composicao?.trim() && !input.assinatura?.trim() &&
    !input.proibicao?.trim() && (!input.cores || input.cores.length === 0)
}

export async function atualizarDirecaoArte(
  input: AtualizarDirecaoArteInput,
  ctx: AtualizarDirecaoArteCtx,
  deps: AtualizarDirecaoArteDeps = {},
): Promise<AtualizarDirecaoArteResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  if (isEmpty(input)) {
    return {
      output: 'Me diz a regra visual que você quer gravar — ex.: "fundos sempre claros" ou "sem imagens genéricas".',
      patch: null,
    }
  }

  const getCompanyName = deps.getCompanyName ?? (() => getSetting('company_name'))
  const ensureBrand = deps.ensureDefaultBrand ?? ensureBrandImpl
  const getDir = deps.getDirecaoArte ?? getDirecaoArteImpl
  const upsert = deps.upsertDirecaoArte ?? upsertDirecaoArteImpl
  const now = deps.now ?? (() => new Date().toISOString())

  const nome = (await getCompanyName())?.trim() || 'Minha marca'
  const brand = await ensureBrand(ctx.operatorId, nome)

  const patch: DirecaoArtePatch = {
    ...(input.estilo?.trim() ? { estiloFotografico: input.estilo.trim() } : {}),
    ...(input.mood?.trim() ? { mood: input.mood.trim() } : {}),
    ...(input.iluminacao?.trim() ? { iluminacao: input.iluminacao.trim() } : {}),
    ...(input.composicao?.trim() ? { composicao: input.composicao.trim() } : {}),
    ...(input.assinatura?.trim() ? { assinatura: input.assinatura.trim() } : {}),
    ...(input.proibicao?.trim() ? { proibicoes: [input.proibicao.trim()] } : {}),
    ...(input.cores?.length ? { paleta: input.cores } : {}),
    ...(input.regra?.trim() ? { aprendizados: [{ texto: input.regra.trim() }] } : {}),
  }

  const atual = await getDir(ctx.operatorId, brand.id)
  const next = mergeDirecaoArte(atual, patch, { origem: 'operador', at: now() })
  await upsert(ctx.operatorId, brand.id, next)

  const direcaoPatch: EstudioPatch = { op: 'upsert', entidade: 'direcao', direcao: next }
  return { output: 'Anotei na direção de arte.', patch: direcaoPatch }
}
