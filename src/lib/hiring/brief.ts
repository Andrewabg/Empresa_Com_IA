


import { normalizarTermo } from './toolkit-aliases'

export const FERRAMENTA_STATUS = [
  'sugerido',           
  'aguardando_conexao', 
  'conectada',
  'pendente',           
  'indisponivel',       
  'dispensado',         
] as const
export type FerramentaStatus = (typeof FERRAMENTA_STATUS)[number]


const RANK: Record<FerramentaStatus, number> = {
  sugerido: 0, aguardando_conexao: 1, pendente: 2, conectada: 3, indisponivel: 3, dispensado: 4,
}

const DECISAO = new Set<FerramentaStatus>(['dispensado', 'pendente', 'indisponivel', 'aguardando_conexao'])

export interface FerramentaBrief {
  mencao: string          
  slug: string            
  name: string            
  status: FerramentaStatus
}

export interface HiringBrief {
  papel?: string
  missao?: string
  resultado?: string      
  tom?: string
  nome?: string           
  ferramentas: FerramentaBrief[]
  semFerramentas?: boolean
  fronteiras: string[]
  fronteirasPadrao?: boolean  
}

export const EMPTY_BRIEF: HiringBrief = Object.freeze({ ferramentas: [], fronteiras: [] }) as HiringBrief


export type HiringMode = 'criacao' | 'revisao'

export interface BriefPatch {
  papel?: string
  missao?: string
  resultado?: string
  tom?: string
  nome?: string
  ferramenta?: FerramentaBrief
  fronteira?: string
  semFerramentas?: boolean
  fronteirasPadrao?: boolean
}

const norm = (s: string) => normalizarTermo(s.trim())


const INDISPONIVEL_PREFIX = 'indisponivel:'


export function slugsRequired(brief: HiringBrief): string[] {
  return brief.ferramentas
    .filter((f) => f.status === 'pendente' && !f.slug.startsWith(INDISPONIVEL_PREFIX))
    .map((f) => f.slug)
}


export function slugsUsaveis(brief: HiringBrief): string[] {
  return brief.ferramentas
    .filter((f) => (f.status === 'conectada' || f.status === 'pendente') && !f.slug.startsWith(INDISPONIVEL_PREFIX))
    .map((f) => f.slug)
}


export function applyBriefPatch(brief: HiringBrief, patch: BriefPatch): HiringBrief {
  const out: HiringBrief = { ...brief, ferramentas: [...brief.ferramentas], fronteiras: [...brief.fronteiras] }
  for (const k of ['papel', 'missao', 'resultado', 'tom', 'nome'] as const) {
    const v = patch[k]
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  if (typeof patch.semFerramentas === 'boolean') out.semFerramentas = patch.semFerramentas
  if (typeof patch.fronteirasPadrao === 'boolean') out.fronteirasPadrao = patch.fronteirasPadrao
  if (patch.fronteira && patch.fronteira.trim()) {
    if (!out.fronteiras.some((f) => norm(f) === norm(patch.fronteira!))) out.fronteiras.push(patch.fronteira.trim())
  }
  const f = patch.ferramenta
  if (f && f.slug.trim() && FERRAMENTA_STATUS.includes(f.status)) {
    const i = out.ferramentas.findIndex((x) => x.slug === f.slug)
    if (i === -1) out.ferramentas.push({ ...f })
    else {
      const atual = out.ferramentas[i]
      const avanca = RANK[f.status] >= RANK[atual.status] || DECISAO.has(f.status)
      out.ferramentas[i] = avanca ? { ...atual, ...f } : atual
    }
  }
  return out
}
