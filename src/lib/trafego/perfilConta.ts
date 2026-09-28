




import { PURCHASE_TYPES, LEAD_TYPES } from '@/lib/trafego/normalize'
import { NICHOS_POR_ARQUETIPO } from '@/lib/trafego/benchmarks'

export type ArquetipoConta = 'ecommerce' | 'infoproduto' | 'lead-gen' | 'servico-local'
export type MetricaPrimaria = 'roas' | 'cpa' 

export interface FrameConta {
  arquetipo: ArquetipoConta
  metricaPrimaria: MetricaPrimaria
  direcao: 'maior_melhor' | 'menor_melhor'
  conversaoTypes: readonly string[]
  alvo?: number
  ticket?: number
  
  margem?: number
  nicho?: string
  origem: 'inferido' | 'declarado'
}


const MODO_ROAS: ReadonlySet<ArquetipoConta> = new Set<ArquetipoConta>(['ecommerce', 'infoproduto'])


export function frameDeArquetipo(
  arquetipo: ArquetipoConta,
  opts: { alvo?: number; ticket?: number; margem?: number; nicho?: string; origem?: FrameConta['origem'] } = {},
): FrameConta {
  const roas = MODO_ROAS.has(arquetipo)
  return {
    arquetipo,
    metricaPrimaria: roas ? 'roas' : 'cpa',
    direcao: roas ? 'maior_melhor' : 'menor_melhor',
    conversaoTypes: roas ? PURCHASE_TYPES : LEAD_TYPES,
    ...(opts.alvo !== undefined ? { alvo: opts.alvo } : {}),
    ...(opts.ticket !== undefined ? { ticket: opts.ticket } : {}),
    ...(opts.margem !== undefined ? { margem: opts.margem } : {}),
    ...(opts.nicho ? { nicho: opts.nicho } : {}),
    origem: opts.origem ?? 'inferido',
  }
}


const GOALS_LEAD: ReadonlySet<string> = new Set(['LEAD_GENERATION', 'QUALITY_LEAD', 'LEAD'])

const GOALS_VENDA: ReadonlySet<string> = new Set(['OFFSITE_CONVERSIONS', 'VALUE', 'PURCHASE'])


export function inferirArquetipo(sinais: { optimizationGoals: string[]; temPurchase: boolean }): ArquetipoConta {
  const goals = sinais.optimizationGoals.map((g) => g.toUpperCase())
  if (goals.some((g) => GOALS_LEAD.has(g))) return 'lead-gen'
  if (sinais.temPurchase || goals.some((g) => GOALS_VENDA.has(g))) return 'ecommerce'
  return 'ecommerce'
}


export function inferirFrame(sinais: { optimizationGoals: string[]; temPurchase: boolean }): FrameConta {
  return frameDeArquetipo(inferirArquetipo(sinais), { origem: 'inferido' })
}


export interface PerfilContaSalvo {
  arquetipo?: ArquetipoConta
  nicho?: string
  alvo?: number
  ticket?: number
  
  margem?: number
}


export function resolverFrame(salvo: PerfilContaSalvo | undefined, inferido: FrameConta): FrameConta {
  if (salvo?.arquetipo) {
    return frameDeArquetipo(salvo.arquetipo, {
      alvo: salvo.alvo,
      ticket: salvo.ticket,
      margem: salvo.margem,
      nicho: salvo.nicho,
      origem: 'declarado',
    })
  }
  if (!salvo) return inferido
  return {
    ...inferido,
    ...(salvo.nicho ? { nicho: salvo.nicho } : {}),
    ...(salvo.alvo !== undefined ? { alvo: salvo.alvo } : {}),
    ...(salvo.ticket !== undefined ? { ticket: salvo.ticket } : {}),
    ...(salvo.margem !== undefined ? { margem: salvo.margem } : {}),
  }
}




export const ARQUETIPOS: readonly ArquetipoConta[] = ['ecommerce', 'infoproduto', 'lead-gen', 'servico-local']


export const ARQUETIPO_LABEL: Record<ArquetipoConta, string> = {
  ecommerce: 'Loja / E-commerce',
  infoproduto: 'Infoproduto / Lançamento',
  'lead-gen': 'Captação de leads',
  'servico-local': 'Serviço local',
}

const ARQUETIPO_SET: ReadonlySet<string> = new Set<string>(ARQUETIPOS)



const NICHOS_VALIDOS: ReadonlySet<string> = new Set<string>(Object.values(NICHOS_POR_ARQUETIPO).flat())


export function parsePerfilBody(body: unknown): { perfilConta: PerfilContaSalvo } | { erro: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { erro: 'Dados inválidos.' }
  }
  const b = body as Record<string, unknown>
  const perfil: PerfilContaSalvo = {}

  if (b.arquetipo !== undefined) {
    if (typeof b.arquetipo !== 'string' || !ARQUETIPO_SET.has(b.arquetipo)) {
      return { erro: 'Tipo de negócio inválido.' }
    }
    perfil.arquetipo = b.arquetipo as ArquetipoConta
  }

  
  
  
  if (typeof b.nicho === 'string') {
    const n = b.nicho.trim()
    if (NICHOS_VALIDOS.has(n)) perfil.nicho = n
  }

  const numPos = (v: unknown, campo: string): { valor: number } | { erro: string } => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
      return { erro: `${campo} deve ser um número maior que zero.` }
    }
    return { valor: v }
  }

  if (b.alvo !== undefined) {
    const r = numPos(b.alvo, 'O CPL/CPA alvo')
    if ('erro' in r) return r
    perfil.alvo = r.valor
  }

  if (b.ticket !== undefined) {
    const r = numPos(b.ticket, 'O ticket médio')
    if ('erro' in r) return r
    perfil.ticket = r.valor
  }

  
  
  if (b.margem !== undefined) {
    if (typeof b.margem !== 'number' || !Number.isFinite(b.margem) || b.margem <= 0 || b.margem > 1) {
      return { erro: 'A margem deve ser um número entre 0 e 1 (ex.: 0,6 para 60%).' }
    }
    perfil.margem = b.margem
  }

  return { perfilConta: perfil }
}
