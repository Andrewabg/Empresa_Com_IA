











export interface AudienciaRef {
  id?: string
  name?: string
}

export interface TargetingRaw {
  geo_locations?: { countries?: string[]; location_types?: string[] }
  age_min?: number
  age_max?: number
  genders?: number[]                        
  custom_audiences?: AudienciaRef[]
  excluded_custom_audiences?: AudienciaRef[]
  targeting_automation?: { advantage_audience?: number }
  publisher_platforms?: string[]            
  facebook_positions?: string[]
  instagram_positions?: string[]
  messenger_positions?: string[]
  audience_network_positions?: string[]
  flexible_spec?: Array<{ interests?: AudienciaRef[] }>
  interests?: AudienciaRef[]
}

export interface CampanhaRaw {
  objective?: string
  daily_budget?: string | number
  lifetime_budget?: string | number
  bid_strategy?: string
  name?: string
}

export interface ContextoConjuntoRaw {
  optimization_goal?: string
  billing_event?: string
  promoted_object?: { pixel_id?: string; custom_event_type?: string; product_set_id?: string; product_catalog_id?: string }
  targeting?: TargetingRaw
  daily_budget?: string | number            
  lifetime_budget?: string | number         
  campaign?: CampanhaRaw
}






function posicaoPt(pos: string): string {
  const map: Record<string, string> = {
    feed: 'feed',
    story: 'stories',
    stories: 'stories',
    reels: 'reels',
    marketplace: 'marketplace',
    video_feeds: 'vídeo',
    explore: 'explorar',
    search: 'busca',
    instream_video: 'vídeo',
    right_hand_column: 'coluna direita',
  }
  return map[pos] ?? pos
}


function paisPt(codigo: string): string {
  const map: Record<string, string> = {
    BR: 'Brasil',
    US: 'Estados Unidos',
    PT: 'Portugal',
    AR: 'Argentina',
  }
  return map[codigo] ?? codigo
}






function orcamentoValido(v: string | number | undefined): boolean {
  if (v === undefined || v === null) return false
  const n = typeof v === 'string' ? parseFloat(v) : v
  return !isNaN(n) && n > 0
}


function temPosicaoManual(t: TargetingRaw): boolean {
  const posicoes = [
    ...(t.publisher_platforms ?? []),
    ...(t.facebook_positions ?? []),
    ...(t.instagram_positions ?? []),
    ...(t.messenger_positions ?? []),
    ...(t.audience_network_positions ?? []),
  ]
  return posicoes.length > 0
}






export function resumoObjetivo(campaign?: CampanhaRaw): string | undefined {
  const obj = (campaign?.objective ?? '').trim()
  if (!obj) return undefined
  const map: Record<string, string> = {
    OUTCOME_SALES: 'Vendas',
    OUTCOME_LEADS: 'Leads',
    OUTCOME_TRAFFIC: 'Tráfego',
    OUTCOME_ENGAGEMENT: 'Engajamento',
    OUTCOME_AWARENESS: 'Reconhecimento',
    OUTCOME_APP_PROMOTION: 'Promoção de app',
  }
  return map[obj] ?? obj
}


export function formatarReais(valorCentavos: string | number): string {
  const n = typeof valorCentavos === 'string' ? parseFloat(valorCentavos) : valorCentavos
  if (!Number.isFinite(n) || n < 0) return 'R$ 0'

  
  const reaisTotal = Math.round(n) 
  const reaisInt = Math.floor(reaisTotal / 100)
  const centavos = reaisTotal % 100

  
  const parteInteira = reaisInt
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  if (centavos === 0) {
    return `R$ ${parteInteira}`
  }
  const parteCentavos = centavos.toString().padStart(2, '0')
  return `R$ ${parteInteira},${parteCentavos}`
}


export function resumoOrcamento(
  raw: ContextoConjuntoRaw,
): { valor: string; origem: string } | undefined {
  if (orcamentoValido(raw.daily_budget)) {
    return { valor: `${formatarReais(raw.daily_budget!)}/dia`, origem: 'no conjunto (ABO)' }
  }
  if (orcamentoValido(raw.lifetime_budget)) {
    return { valor: `${formatarReais(raw.lifetime_budget!)} no total`, origem: 'no conjunto (ABO)' }
  }
  if (orcamentoValido(raw.campaign?.daily_budget)) {
    return { valor: `${formatarReais(raw.campaign!.daily_budget!)}/dia`, origem: 'na campanha (CBO)' }
  }
  if (orcamentoValido(raw.campaign?.lifetime_budget)) {
    return { valor: `${formatarReais(raw.campaign!.lifetime_budget!)} no total`, origem: 'na campanha (CBO)' }
  }
  return undefined
}


export function resumoPosicionamento(targeting?: TargetingRaw): string | undefined {
  if (!targeting) return undefined

  if (!temPosicaoManual(targeting)) {
    return 'Advantage+ (automático)'
  }

  
  const ordemCanonica = ['facebook', 'instagram', 'messenger', 'audience_network']

  
  const posPorPlataforma: Record<string, string[] | undefined> = {
    facebook: targeting.facebook_positions,
    instagram: targeting.instagram_positions,
    messenger: targeting.messenger_positions,
    audience_network: targeting.audience_network_positions,
  }

  
  const plataformaPt: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    messenger: 'Messenger',
    audience_network: 'Audience Network',
  }

  const platforms = targeting.publisher_platforms ?? []
  
  const plataformasPresentes = ordemCanonica.filter(
    (p) => platforms.includes(p) || (posPorPlataforma[p]?.length ?? 0) > 0,
  )

  
  const extras = platforms.filter((p) => !ordemCanonica.includes(p))

  const partes: string[] = []

  for (const plat of plataformasPresentes) {
    const label = plataformaPt[plat] ?? plat
    const posicoes = (posPorPlataforma[plat] ?? []).map(posicaoPt)
    if (posicoes.length > 0) {
      partes.push(`${label}: ${posicoes.join(', ')}`)
    } else {
      partes.push(label)
    }
  }

  
  for (const plat of extras) {
    partes.push(plat)
  }

  return partes.join(' · ')
}


export function resumoPublico(
  targeting?: TargetingRaw,
): { principal: string; detalhados: string[] } | undefined {
  if (!targeting) return undefined

  const partesPrincipal: string[] = []
  const detalhados: string[] = []

  
  const paises = targeting.geo_locations?.countries ?? []
  if (paises.length > 0) {
    partesPrincipal.push(paises.map(paisPt).join(', '))
  }

  
  const { age_min, age_max } = targeting
  if (age_min !== undefined && age_max !== undefined) {
    partesPrincipal.push(`${age_min}-${age_max} anos`)
  } else if (age_min !== undefined) {
    partesPrincipal.push(`${age_min}+ anos`)
  } else if (age_max !== undefined) {
    partesPrincipal.push(`até ${age_max} anos`)
  }

  
  const g = targeting.genders
  if (!g || g.length === 0 || (g.includes(1) && g.includes(2))) {
    partesPrincipal.push('todos')
  } else if (g.includes(1)) {
    partesPrincipal.push('homens')
  } else if (g.includes(2)) {
    partesPrincipal.push('mulheres')
  } else {
    partesPrincipal.push('todos') 
  }

  
  const isAdvantage = targeting.targeting_automation?.advantage_audience === 1
  if (isAdvantage) {
    partesPrincipal.push('público automático (Advantage+)')
  } else {
    const nCustom = targeting.custom_audiences?.length ?? 0

    
    const interestSet = new Set<string>()
    for (const spec of targeting.flexible_spec ?? []) {
      for (const int of spec.interests ?? []) {
        const key = int.id ?? int.name ?? ''
        if (key) interestSet.add(key)
      }
    }
    for (const int of targeting.interests ?? []) {
      const key = int.id ?? int.name ?? ''
      if (key) interestSet.add(key)
    }
    const nInteresses = interestSet.size

    const tipoPartes: string[] = []
    if (nCustom > 0) {
      tipoPartes.push(nCustom === 1 ? '1 público personalizado' : `${nCustom} públicos personalizados`)
    }
    if (nInteresses > 0) {
      tipoPartes.push(`interesses (${nInteresses})`)
    }
    if (tipoPartes.length > 0) {
      partesPrincipal.push(tipoPartes.join(' + '))
    }
  }

  
  for (const ca of targeting.custom_audiences ?? []) {
    const label = ca.name ?? ca.id
    if (label) detalhados.push(`Público: ${label}`)
  }
  for (const ex of targeting.excluded_custom_audiences ?? []) {
    const label = ex.name ?? ex.id
    if (label) detalhados.push(`Excluído: ${label}`)
  }
  
  for (const spec of targeting.flexible_spec ?? []) {
    for (const int of spec.interests ?? []) {
      const label = int.name ?? int.id
      if (label) detalhados.push(`Interesse: ${label}`)
    }
  }
  for (const int of targeting.interests ?? []) {
    const label = int.name ?? int.id
    if (label) detalhados.push(`Interesse: ${label}`)
  }

  return { principal: partesPrincipal.join(' · '), detalhados }
}


export function resumoOtimizacao(raw: ContextoConjuntoRaw): string | undefined {
  const goal = (raw.optimization_goal ?? '').trim()
  if (!goal) return undefined

  const goalMap: Record<string, string> = {
    OFFSITE_CONVERSIONS: 'Conversões',
    VALUE: 'Valor de conversão',
    LINK_CLICKS: 'Cliques no link',
    LANDING_PAGE_VIEWS: 'Visitas à página',
    REACH: 'Alcance',
    IMPRESSIONS: 'Impressões',
    THRUPLAY: 'Reproduções de vídeo',
    LEAD_GENERATION: 'Cadastros',
  }

  const eventMap: Record<string, string> = {
    PURCHASE: 'Compra',
    LEAD: 'Cadastro',
    ADD_TO_CART: 'Adição ao carrinho',
    INITIATE_CHECKOUT: 'Início de checkout',
    COMPLETE_REGISTRATION: 'Cadastro completo',
    VIEW_CONTENT: 'Visualização',
  }

  let resultado = goalMap[goal] ?? goal

  const po = raw.promoted_object
  const ev = po?.custom_event_type?.trim()
  if (ev) {
    const evLabel = eventMap[ev] ?? ev
    resultado += ` por ${evLabel}`
  }

  if (po?.pixel_id) {
    resultado += ' (pixel)'
  }

  return resultado
}


export function resumoAdvantage(
  targeting?: TargetingRaw,
): { publico: boolean; posicionamento: boolean } {
  if (!targeting) return { publico: false, posicionamento: false }

  const publico = targeting.targeting_automation?.advantage_audience === 1
  const posicionamento = !temPosicaoManual(targeting)

  return { publico, posicionamento }
}






export interface ContextoConjuntoResumo {
  objetivo?: string
  orcamento?: string            
  posicionamento?: string
  publico?: string              
  otimizacao?: string
  advantage?: string            
  publicoDetalhado?: string[]   
}


function capitalizar(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s
}


export function montarContextoResumo(raw: ContextoConjuntoRaw): ContextoConjuntoResumo {
  const out: ContextoConjuntoResumo = {}

  const objetivo = resumoObjetivo(raw.campaign)
  if (objetivo) out.objetivo = objetivo

  const orc = resumoOrcamento(raw)
  if (orc) out.orcamento = `${orc.valor} · ${orc.origem}`

  const pos = resumoPosicionamento(raw.targeting)
  if (pos) out.posicionamento = pos

  const pub = resumoPublico(raw.targeting)
  if (pub?.principal) out.publico = pub.principal
  if (pub?.detalhados && pub.detalhados.length > 0) out.publicoDetalhado = pub.detalhados

  const otim = resumoOtimizacao(raw)
  if (otim) out.otimizacao = otim

  if (raw.targeting) {
    const adv = resumoAdvantage(raw.targeting)
    const partes: string[] = []
    if (adv.publico) partes.push('público automático')
    if (adv.posicionamento) partes.push('posicionamento automático')
    out.advantage = partes.length ? capitalizar(partes.join(' + ')) : 'desligado'
  }

  return out
}
