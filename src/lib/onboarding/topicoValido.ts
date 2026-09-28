
import { TOPICS } from '@/server/interview/topics'
import { NOME_EMPRESA_ID } from './perfis'
import { IDS_PRE_EMPRESA } from './preEmpresa'


export const TOPIC_IDS_VALIDOS: readonly string[] = Array.from(
  new Set<string>([...TOPICS.map((t) => t.id), NOME_EMPRESA_ID, ...IDS_PRE_EMPRESA]),
)


export const TOPIC_IDS_CONHECIMENTO: readonly string[] = TOPICS.map((t) => t.id)


export function ehTopicoValido(id: string | null | undefined): boolean {
  return typeof id === 'string' && TOPIC_IDS_VALIDOS.includes(id)
}
