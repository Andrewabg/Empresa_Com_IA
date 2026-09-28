
import { TOPICS } from '@/server/interview/topics'
import { NOME_EMPRESA_ID } from './perfis'
import { topicoPreEmpresa } from './preEmpresa'
import { ROTULOS_IDENTIDADE } from './fatosIdentidade'
import { ROTULOS_REFLECTOR, type CategoriaFato } from '@/lib/memory/fichaEmpresa'


export interface FatoDoTopico {
  rotulo: string
  categoria: CategoriaFato
}


const CATEGORIA_POR_TOPICO: ReadonlyMap<string, CategoriaFato> = new Map<string, CategoriaFato>([
  [NOME_EMPRESA_ID, 'dados'],
  ['o-que-faz', 'dados'],
  ['publico', 'publico'],
  ['oferta', 'oferta'],
  ['receita', 'financeiro'],
  ['metas', 'outro'],
  ['processos', 'outro'],
  ['pessoas', 'outro'],
  ['ferramentas', 'outro'],
  ['posicionamento', 'outro'],
  ['restricoes', 'politica'],
])


const ROTULO_PROPRIO: ReadonlyMap<string, string> = new Map<string, string>([
  [NOME_EMPRESA_ID, ROTULOS_IDENTIDADE.companyName],
  ['publico', ROTULOS_REFLECTOR.publico],
  ['posicionamento', 'Posicionamento'],
])


export function fatoDoTopico(topicId: string): FatoDoTopico | null {
  
  
  const pre = topicoPreEmpresa(topicId)
  if (pre) return { rotulo: pre.rotulo, categoria: pre.categoria }

  const categoria = CATEGORIA_POR_TOPICO.get(topicId)
  if (!categoria) return null
  const rotulo = ROTULO_PROPRIO.get(topicId) ?? TOPICS.find((t) => t.id === topicId)?.label
  if (!rotulo) return null
  return { rotulo, categoria }
}
