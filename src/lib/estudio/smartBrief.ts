
import type { FormatoSpec } from '@/lib/estudio/formatos'
import type { BrandVoice } from '@/lib/estudio/brandVoice'

export interface BriefAval { pronto: boolean; perguntas: string[] }

const MAX_PERGUNTAS = 3


export function avaliarBrief(
  formato: FormatoSpec,
  brief: Record<string, unknown>,
  voice: BrandVoice,
): BriefAval {
  const coreGaps: string[] = []
  const temOferta = !!voice.dna?.ofertas?.length || !!brief.oferta
  const temPublico = !!(voice.dna?.publico?.dores?.length || voice.dna?.publico?.desejos?.length)
  const temObjetivo = !!brief.objetivo

  if (!temOferta) coreGaps.push('Qual é a oferta/produto exato desta peça?')
  if (!temPublico) coreGaps.push('Para quem é? (público, dor principal, desejo)')
  if (!temObjetivo) coreGaps.push('Qual o objetivo desta peça (clique, lead, venda, engajamento)?')

  const pronto = coreGaps.length === 0
  if (pronto) return { pronto: true, perguntas: [] }

  
  const perguntas = [...coreGaps]
  for (const q of formato.perguntas) {
    if (perguntas.length >= MAX_PERGUNTAS) break
    perguntas.push(q)
  }
  return { pronto: false, perguntas: perguntas.slice(0, MAX_PERGUNTAS) } 
}
