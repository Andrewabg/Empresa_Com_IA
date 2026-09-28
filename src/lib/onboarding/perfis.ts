import { TOPICS } from '@/server/interview/topics'
import { slotsSementePreEmpresa, topicoPreEmpresa } from './preEmpresa'
import type { Perfil, Slot } from './types'


export const NUCLEO_IDS: string[] = TOPICS.filter((t) => t.mandatory).map((t) => t.id)
const NUCLEO_TEM_EMPRESA = new Set(NUCLEO_IDS)


export const NOME_EMPRESA_ID = 'nome-empresa'


const PERGUNTA_GENERICA = 'Pode me contar mais sobre o seu negócio?'


export function perguntaDoSlot(slotId: string): string {
  if (slotId === NOME_EMPRESA_ID) return 'Qual é o nome da sua empresa?'
  const pre = topicoPreEmpresa(slotId)
  if (pre) return pre.pergunta
  return TOPICS.find((t) => t.id === slotId)?.seedQuestion ?? PERGUNTA_GENERICA
}


export function nucleoCoberto(covered: string[]): boolean {
  return NUCLEO_IDS.every((id) => covered.includes(id))
}


export function slotsSemente(perfil: Perfil, opts?: { incluirNome?: boolean; nucleoIds?: readonly string[] }): Slot[] {
  
  
  
  
  if (perfil === 'sem_empresa') return slotsSementePreEmpresa()
  if (perfil !== 'tem_empresa') return []
  const nucleo = new Set(opts?.nucleoIds?.length ? opts.nucleoIds : NUCLEO_IDS)
  const nomeSlot: Slot[] = opts?.incluirNome
    ? [
        {
          id: NOME_EMPRESA_ID,
          categoria: 'identidade',
          nucleo: true,
          prioridade: -1, 
          status: 'vazio' as const,
          profundidade: 0 as const,
          ladder: 0,
          reforcos: 0,
          reespelhos: 0,
        },
      ]
    : []
  return nomeSlot.concat(
    TOPICS.map((t, i) => ({
      id: t.id,
      categoria: t.id,
      nucleo: nucleo.has(t.id),
      prioridade: nucleo.has(t.id) ? i : 100 + i, 
      status: 'vazio' as const,
      profundidade: 0 as const,
      ladder: 0,
      reforcos: 0,
      reespelhos: 0,
    })),
  )
}
