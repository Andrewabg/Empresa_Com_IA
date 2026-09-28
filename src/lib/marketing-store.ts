
import type { AgentTools } from '@/data/agents'  


export interface MarketingSeedCard {
  id: string
  name: string
  role: string
  tagline: string
  descricao: string
  toolsResumo: string[]   
  skills: string[]
  category: string | null 
  voice: string | null    
  suggestedManager: string | null 
}


export interface MarketingSeedLike {
  id: string
  name: string
  role: string
  tagline: string
  descricao: string
  system_prompt: string
  tools: AgentTools
  skills: string[]
  category?: string | null
  voice?: string | null
  suggested_manager?: string | null
}


export function toCard(seed: MarketingSeedLike): MarketingSeedCard {
  const toolsResumo = Object.entries(seed.tools)
    .filter(([, v]) => v === true)
    .map(([k]) => k)
  return {
    id: seed.id, name: seed.name, role: seed.role,
    tagline: seed.tagline, descricao: seed.descricao,
    toolsResumo, skills: seed.skills,
    category: seed.category ?? null,
    voice: seed.voice ?? null,
    suggestedManager: seed.suggested_manager ?? null,
  }
}


export interface SecaoLoja {
  titulo: string
  cards: MarketingSeedCard[]
}




const DEPARTAMENTOS: ReadonlyArray<{ titulo: string; categories: readonly string[] }> = [
  { titulo: 'Marketing & Conteúdo', categories: ['marketing'] },
  { titulo: 'Vendas & Atendimento', categories: ['vendas', 'atendimento'] },
  { titulo: 'Financeiro & Dados', categories: ['financeiro', 'dados'] },
  { titulo: 'Operações, Gente & Jurídico', categories: ['operacoes', 'gente', 'juridico'] },
]


const CATEGORIES_CONHECIDAS = new Set(DEPARTAMENTOS.flatMap((d) => [...d.categories]))


export function agruparPorDepartamento(cards: MarketingSeedCard[]): SecaoLoja[] {
  const secoes: SecaoLoja[] = []
  for (const dep of DEPARTAMENTOS) {
    
    const doDep = cards.filter((c) => c.category !== null && dep.categories.includes(c.category))
    if (doDep.length > 0) secoes.push({ titulo: dep.titulo, cards: doDep })
  }
  const outros = cards.filter((c) => c.category === null || !CATEGORIES_CONHECIDAS.has(c.category))
  if (outros.length > 0) secoes.push({ titulo: 'Outros', cards: outros })
  return secoes
}
