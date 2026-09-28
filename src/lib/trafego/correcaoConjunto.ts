




import type { ContextoConjuntoRaw } from './contextoConjunto'
import { resumoOtimizacao } from './contextoConjunto'





export interface CorrecaoOtimizacao {
  correcao: { optimization_goal: string; promoted_object: { pixel_id: string; custom_event_type: string } }
  antesPt: string
  depoisPt: string
}






const GOALS_TOPO = new Set([
  'LINK_CLICKS',
  'LANDING_PAGE_VIEWS',
  'REACH',
  'IMPRESSIONS',
  'THRUPLAY',
])


const GOALS_CONVERSAO = new Set([
  'OFFSITE_CONVERSIONS',
  'VALUE',
])


function eventoParaObjetivo(objective: string | undefined): string | null {
  switch (objective) {
    case 'OUTCOME_SALES':
      return 'PURCHASE'
    case 'OUTCOME_LEADS':
      return 'LEAD'
    default:
      return null
  }
}






export function decidirCorrecaoOtimizacao(
  raw: ContextoConjuntoRaw,
  pixelId?: string,
): CorrecaoOtimizacao | null {
  const obj = raw.campaign?.objective
  const evento = eventoParaObjetivo(obj)
  if (!evento) return null

  const goal = raw.optimization_goal
  const po = raw.promoted_object

  let pixelEfetivo: string | undefined
  let disparou = false

  
  if (goal !== undefined && GOALS_TOPO.has(goal)) {
    pixelEfetivo = po?.pixel_id ?? pixelId
    disparou = true
  }

  
  if (
    !disparou &&
    goal !== undefined &&
    GOALS_CONVERSAO.has(goal) &&
    po != null &&
    typeof po === 'object' &&
    !po.custom_event_type &&
    !po.product_set_id &&
    !po.product_catalog_id
  ) {
    pixelEfetivo = po.pixel_id ?? pixelId
    disparou = true
  }

  if (!disparou) return null
  if (!pixelEfetivo) return null

  const rawCorrigido: ContextoConjuntoRaw = {
    ...raw,
    optimization_goal: 'OFFSITE_CONVERSIONS',
    promoted_object: {
      pixel_id: pixelEfetivo,
      custom_event_type: evento,
    },
  }

  return {
    correcao: {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      promoted_object: {
        pixel_id: pixelEfetivo,
        custom_event_type: evento,
      },
    },
    antesPt: resumoOtimizacao(raw) ?? '',
    depoisPt: resumoOtimizacao(rawCorrigido) ?? '',
  }
}
