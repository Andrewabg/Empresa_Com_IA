




import type { ContextoConjuntoRaw } from './contextoConjunto'
import { resumoObjetivo } from './contextoConjunto'





export type TipoAviso =
  | 'otimizacao_objetivo'
  | 'conversao_sem_evento'
  | 'publico_amplo'
  | 'cta_fraco'

export interface Aviso {
  tipo: TipoAviso
  texto: string
}






const GOALS_TOPO = new Set([
  'LINK_CLICKS',
  'LANDING_PAGE_VIEWS',
  'REACH',
  'IMPRESSIONS',
  'THRUPLAY',
])


const goalCurtoPt: Record<string, string> = {
  LINK_CLICKS: 'cliques',
  REACH: 'alcance',
  LANDING_PAGE_VIEWS: 'visitas à página',
  IMPRESSIONS: 'impressões',
  THRUPLAY: 'reproduções de vídeo',
}


function objetivoCurto(objective: string | undefined): string {
  switch (objective) {
    case 'OUTCOME_SALES':
      return 'venda'
    case 'OUTCOME_LEADS':
      return 'lead'
    default:
      return ''
  }
}






export function analisarEncaixe(
  raw: ContextoConjuntoRaw,
  args: { cta?: string },
): Aviso[] {
  const avisos: Aviso[] = []

  
  
  
  
  const obj = raw.campaign?.objective
  const goal = raw.optimization_goal

  if (
    obj !== undefined &&
    (obj === 'OUTCOME_SALES' || obj === 'OUTCOME_LEADS') &&
    goal !== undefined &&
    GOALS_TOPO.has(goal)
  ) {
    const resumo = resumoObjetivo(raw.campaign) ?? obj
    const goalLabel = goalCurtoPt[goal] ?? goal
    const objCurto = objetivoCurto(obj)
    avisos.push({
      tipo: 'otimizacao_objetivo',
      texto: `Esse conjunto é de ${resumo} mas otimiza por ${goalLabel}, costuma gastar sem gerar ${objCurto}. Considere um conjunto que otimize por conversão.`,
    })
  }

  
  
  
  
  
  
  const po = raw.promoted_object

  if (
    goal !== undefined &&
    (goal === 'OFFSITE_CONVERSIONS' || goal === 'VALUE') &&
    po !== null &&
    po !== undefined &&
    typeof po === 'object' &&
    !po.custom_event_type &&
    !po.product_set_id &&
    !po.product_catalog_id
  ) {
    avisos.push({
      tipo: 'conversao_sem_evento',
      texto:
        'Otimiza por conversão mas não vejo o evento de conversão configurado. Confira o pixel e o evento do conjunto pra a otimização não ficar às cegas.',
    })
  }

  
  
  
  
  
  
  const t = raw.targeting

  if (t !== undefined && t !== null) {
    const isAdvantage = t.targeting_automation?.advantage_audience === 1
    const temCustom = (t.custom_audiences?.length ?? 0) > 0

    
    let totalInteresses = 0
    for (const spec of t.flexible_spec ?? []) {
      totalInteresses += spec.interests?.length ?? 0
    }
    totalInteresses += t.interests?.length ?? 0

    if (!isAdvantage && !temCustom && totalInteresses === 0) {
      avisos.push({
        tipo: 'publico_amplo',
        texto:
          'O público é só idade e região, sem interesses nem públicos salvos, bem amplo. Se for teste amplo de propósito tudo bem, senão vale estreitar.',
      })
    }
  }

  
  
  
  
  
  
  const cta = (args.cta ?? '').trim().toUpperCase()

  if (
    obj !== undefined &&
    (obj === 'OUTCOME_SALES' || obj === 'OUTCOME_LEADS') &&
    cta === 'LEARN_MORE'
  ) {
    const objCurto = objetivoCurto(obj)
    avisos.push({
      tipo: 'cta_fraco',
      texto: `Num conjunto de ${objCurto}, um CTA de ação ('Comprar agora', 'Cadastre-se') costuma converter melhor que o genérico.`,
    })
  }

  return avisos
}
