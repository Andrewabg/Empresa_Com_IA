
import type { CategoriaFato } from '@/lib/memory/fichaEmpresa'
import type { Slot } from './types'

export interface TopicoPreEmpresa {
  id: string
  
  pergunta: string
  
  rotulo: string
  categoria: CategoriaFato
  nucleo: boolean
}

export const TOPICOS_PRE_EMPRESA: readonly TopicoPreEmpresa[] = [
  {
    id: 'projeto-ideia',
    pergunta: 'Me conta o que você quer montar — qual é a ideia?',
    rotulo: 'Projeto',
    categoria: 'dados',
    nucleo: true,
  },
  {
    id: 'projeto-publico',
    pergunta: 'E pra quem isso seria — quem você quer atender?',
    rotulo: 'Público pretendido',
    categoria: 'publico',
    nucleo: true,
  },
  {
    id: 'projeto-estagio',
    
    
    pergunta: 'Em que pé está: ainda é ideia, já testou com alguém, já vendeu?',
    rotulo: 'Estágio do projeto',
    categoria: 'outro',
    nucleo: false,
  },
]

export const IDS_PRE_EMPRESA: readonly string[] = TOPICOS_PRE_EMPRESA.map((t) => t.id)


export function ehTopicoPreEmpresa(id: string | null | undefined): boolean {
  return typeof id === 'string' && IDS_PRE_EMPRESA.includes(id)
}


export function topicoPreEmpresa(id: string): TopicoPreEmpresa | null {
  return TOPICOS_PRE_EMPRESA.find((t) => t.id === id) ?? null
}


export function slotsSementePreEmpresa(): Slot[] {
  return TOPICOS_PRE_EMPRESA.map((t, i) => ({
    id: t.id,
    categoria: 'projeto',
    nucleo: t.nucleo,
    prioridade: t.nucleo ? i : 100 + i,
    status: 'vazio' as const,
    profundidade: 0 as const,
    ladder: 0,
    reforcos: 0,
    reespelhos: 0,
  }))
}
