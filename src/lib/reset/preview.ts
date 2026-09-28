import type { CategoriaId, ResetFlags } from './tipos'
import { montarRotulos } from './rotulos'
import { ORDEM_CATEGORIAS } from './categorias'
import { DEFAULT_BRANDING } from '@/lib/branding'





export interface ItemPrevia {
  titulo: string
  descricao: string
}

export interface PreviaReset {
  perde: ItemPrevia[]
  mantem: ItemPrevia[]
}






const MANTEM_FIXOS: ItemPrevia[] = [
  {
    titulo: 'Sua licença',
    descricao:
      'a licença, o histórico de ativação e os dados de proveniência nunca são tocados pelo reset',
  },
  {
    titulo: 'Seu acesso de dono',
    descricao: 'você continua logado e dono, com acesso total ao painel',
  },
]






export function resumirPrevia(
  flags: ResetFlags,
  nomeAssistente: string = DEFAULT_BRANDING.assistantName,
): PreviaReset {
  const ROTULOS = montarRotulos(nomeAssistente)

  const categoriasEfetivas: CategoriaId[] =
    flags.categorias.includes('identidade')
      ? [...ORDEM_CATEGORIAS]
      : [...flags.categorias]

  const efetivas = new Set(categoriasEfetivas)

  const perde: ItemPrevia[] = []
  const mantem: ItemPrevia[] = []

  
  for (const cat of ORDEM_CATEGORIAS) {
    const rotulo = ROTULOS[cat]
    const item: ItemPrevia = { titulo: rotulo.titulo, descricao: rotulo.descricao }
    if (efetivas.has(cat)) {
      perde.push(item)
    } else {
      mantem.push(item)
    }
  }

  
  for (const fixo of MANTEM_FIXOS) {
    mantem.push(fixo)
  }

  return { perde, mantem }
}
