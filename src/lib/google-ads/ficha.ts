


import { cpaTeto } from '@/lib/google-ads/cpa-ceiling'
import { modoPorVertical, type ModoPolitica } from '@/lib/google-ads/politicas-br'






export interface Ficha {
  
  ticket?: number | null
  
  margem?: number | null
  
  ltv?: number | null
  
  maxPorClienteDesejado?: number | null
  
  cpaTetoBreakeven?: number | null
  
  cpaTetoRealista?: number | null
  
  vertical?: string
  
  modoPolitica?: ModoPolitica
  
  oQueFaz?: string
  
  publicoAlvo?: string
  
  geografia?: string
  
  capacidade?: number | null
  
  sazonalidade?: string
  
  objetivo?: string
}






export function parseNumeroBr(s: string): number | null {
  if (!s || typeof s !== 'string') return null
  const raw = s.trim()
  if (!raw) return null

  
  const isPorcentagem = raw.includes('%')

  
  let limpo = raw.replace(/R\$\s*/i, '').replace('%', '').trim()

  if (!limpo) return null

  
  
  
  
  
  

  
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  }
  
  
  else if (/^\d{1,3}\.\d{3}$/.test(limpo)) {
    limpo = limpo.replace('.', '')
  }

  const n = Number(limpo)
  if (!isFinite(n) || isNaN(n)) return null

  return isPorcentagem ? n / 100 : n
}





export interface ResolverCpaTetoInput {
  ticket: number
  margem: number
  ltv?: number
  
  maxPorClienteDesejado?: number
}

export interface ResolverCpaTetoResult {
  
  breakeven: number | null
  
  alvoRealista: number | null
  
  precisouResetar: boolean
}


export function resolverCpaTeto(input: ResolverCpaTetoInput): ResolverCpaTetoResult {
  const { ticket, margem, ltv = 1, maxPorClienteDesejado } = input

  const breakeven = cpaTeto({ ticket, margem, fatorLtv: ltv })

  
  if (breakeven === null) {
    return { breakeven: null, alvoRealista: null, precisouResetar: false }
  }

  
  if (maxPorClienteDesejado === undefined || maxPorClienteDesejado === null) {
    return { breakeven, alvoRealista: breakeven, precisouResetar: false }
  }

  
  if (maxPorClienteDesejado > breakeven) {
    return { breakeven, alvoRealista: breakeven, precisouResetar: true }
  }

  return { breakeven, alvoRealista: maxPorClienteDesejado, precisouResetar: false }
}






export interface RespostasBrutas {
  ticket?: string
  margem?: string
  ltv?: string
  
  maxPorCliente?: string
  vertical?: string
  oQueFaz?: string
  publicoAlvo?: string
  geografia?: string
  
  capacidade?: string
  sazonalidade?: string
  objetivo?: string
}


export function derivarFicha(respostas: RespostasBrutas): Ficha {
  const ticket = respostas.ticket != null ? parseNumeroBr(respostas.ticket) : null
  const margem = respostas.margem != null ? parseNumeroBr(respostas.margem) : null
  const ltv = respostas.ltv != null ? parseNumeroBr(respostas.ltv) : null
  const maxPorClienteDesejado = respostas.maxPorCliente != null
    ? parseNumeroBr(respostas.maxPorCliente)
    : null
  const capacidade = respostas.capacidade != null ? parseNumeroBr(respostas.capacidade) : null

  
  let cpaTetoBreakeven: number | null = null
  let cpaTetoRealista: number | null = null

  if (ticket !== null && margem !== null) {
    const cpaResult = resolverCpaTeto({
      ticket,
      margem,
      ltv: ltv ?? 1,
      maxPorClienteDesejado: maxPorClienteDesejado ?? undefined,
    })
    cpaTetoBreakeven = cpaResult.breakeven
    cpaTetoRealista = cpaResult.alvoRealista
  }

  
  const vertical = respostas.vertical
  const modoPolitica: ModoPolitica | undefined = vertical
    ? modoPorVertical(vertical)
    : undefined

  return {
    ticket: ticket ?? undefined,
    margem: margem ?? undefined,
    ltv: ltv ?? undefined,
    maxPorClienteDesejado: maxPorClienteDesejado ?? undefined,
    cpaTetoBreakeven,
    cpaTetoRealista,
    vertical,
    modoPolitica,
    oQueFaz: respostas.oQueFaz,
    publicoAlvo: respostas.publicoAlvo,
    geografia: respostas.geografia,
    capacidade: capacidade ?? undefined,
    sazonalidade: respostas.sazonalidade,
    objetivo: respostas.objetivo,
  }
}






const CAMPOS_OBRIGATORIOS: (keyof Ficha)[] = [
  'ticket',
  'margem',
  'vertical',
  'oQueFaz',
  'geografia',
  'capacidade',
  'objetivo',
]


export function fichaCompleta(ficha: Ficha): boolean {
  return CAMPOS_OBRIGATORIOS.every((campo) => {
    const val = ficha[campo]
    return val !== undefined && val !== null && val !== ''
  })
}
